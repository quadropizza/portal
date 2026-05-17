"use server";

import { createClient } from "@/lib/supabase/server";
import { parseExtratoSicredi, type SaidaParsed } from "@/lib/parsers/extrato-sicredi";
import { revalidatePath } from "next/cache";

export type SaidaPreview = SaidaParsed & {
  categoria_sugerida_id: string | null;
  categoria_sugerida_nome: string | null;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  obrigacao_id: string | null;          // se casa com NF em aberto
  obrigacao_valor: number | null;
};

export type UploadExtratoResult = {
  ok: boolean;
  erro?: string;
  preview?: {
    arquivo_id: string;
    periodo: { inicio: string | null; fim: string | null };
    total_saidas_valor: number;
    saidas: SaidaPreview[];
  };
};

export async function uploadExtrato(formData: FormData): Promise<UploadExtratoResult> {
  const file = formData.get("arquivo") as File | null;
  if (!file) return { ok: false, erro: "Sem arquivo" };
  if (file.type !== "application/pdf") return { ok: false, erro: "Só PDF" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "Sem empresa" };

  // Sobe pro Storage
  const buf = Buffer.from(await file.arrayBuffer());
  const caminho = `${empresaId}/extrato/${Date.now()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("anexos")
    .upload(caminho, buf, { contentType: "application/pdf" });
  if (upErr) return { ok: false, erro: `Storage: ${upErr.message}` };

  const { data: anexo } = await supabase
    .from("arquivo_anexo")
    .insert({
      empresa_id: empresaId, bucket: "extrato", caminho,
      nome_original: file.name, mime_type: file.type, tamanho_bytes: file.size,
    })
    .select("id").single();
  const anexoId = (anexo as { id: string }).id;

  let parsed;
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buf);
    parsed = parseExtratoSicredi(data.text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, erro: `Parse: ${msg}` };
  }

  // Carrega fornecedores + regras automáticas pra sugerir categoria
  const { data: fornecedores } = await supabase
    .from("fornecedor")
    .select("id, cnpj, nome, apelido, categoria_padrao_id, categoria:categoria_despesa!fornecedor_categoria_fk(nome)");
  const { data: regras } = await supabase
    .from("categoria_regra_automatica")
    .select("texto_descricao_contem, categoria:categoria_despesa(id,nome)")
    .eq("ativa", true)
    .order("prioridade", { ascending: false });

  const fornByCnpj = new Map<string, any>();
  for (const f of (fornecedores ?? []) as any[]) {
    if (f.cnpj) fornByCnpj.set(f.cnpj.replace(/\D/g, ""), f);
  }

  // NFs em aberto pra casar com LIQUIDACAO BOLETO
  const { data: obrigacoes } = await supabase
    .from("obrigacao_a_pagar")
    .select("id, fornecedor_id, valor_total, valor_pago, data_vencimento, fornecedor:fornecedor(cnpj)")
    .eq("status", "em_aberto");

  const preview: SaidaPreview[] = parsed.saidas.map((s) => {
    let fornecedor: any = null;
    if (s.cnpj_extraido) {
      fornecedor = fornByCnpj.get(s.cnpj_extraido) ?? null;
    }

    let categoriaId: string | null = fornecedor?.categoria_padrao_id ?? null;
    let categoriaNome: string | null = fornecedor?.categoria?.nome ?? null;

    if (!categoriaId) {
      for (const r of (regras ?? []) as any[]) {
        if (!r.texto_descricao_contem || !r.categoria) continue;
        if (s.descricao_original.toUpperCase().includes(r.texto_descricao_contem.toUpperCase())) {
          categoriaId = r.categoria.id;
          categoriaNome = r.categoria.nome;
          break;
        }
      }
    }

    // tenta conciliar boleto
    let obrigacaoId: string | null = null;
    let obrigacaoValor: number | null = null;
    if (s.tipo_movimento === "Boleto" && (s.cnpj_extraido || fornecedor)) {
      const candidata = ((obrigacoes ?? []) as any[]).find((o) => {
        const cnpj = o.fornecedor?.cnpj?.replace(/\D/g, "");
        const valor = Number(o.valor_total) - Number(o.valor_pago);
        return cnpj && cnpj === s.cnpj_extraido && Math.abs(valor - s.valor) < 0.01;
      });
      if (candidata) { obrigacaoId = candidata.id; obrigacaoValor = candidata.valor_total; }
    }

    return {
      ...s,
      categoria_sugerida_id: categoriaId,
      categoria_sugerida_nome: categoriaNome,
      fornecedor_id: fornecedor?.id ?? null,
      fornecedor_nome: fornecedor?.apelido ?? fornecedor?.nome ?? null,
      obrigacao_id: obrigacaoId,
      obrigacao_valor: obrigacaoValor,
    };
  });

  return {
    ok: true,
    preview: {
      arquivo_id: anexoId,
      periodo: parsed.periodo,
      total_saidas_valor: parsed.total_saidas_valor,
      saidas: preview,
    },
  };
}

/**
 * Persiste em lote as saídas já revisadas pelo usuário.
 */
export async function confirmarSaidas(formData: FormData): Promise<{ ok: boolean; inseridas: number; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, inseridas: 0, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, inseridas: 0, erro: "sem empresa" };

  const anexoId = String(formData.get("arquivo_id"));
  const payload = JSON.parse(String(formData.get("saidas"))) as Array<{
    data: string; descricao_original: string; descricao?: string; valor: number;
    categoria_id?: string | null; fornecedor_id?: string | null; obrigacao_id?: string | null;
    forma_pagamento: string;
  }>;

  let inseridas = 0;
  for (const s of payload) {
    const { error } = await supabase.from("saida").insert({
      empresa_id: empresaId,
      data: s.data,
      descricao_original: s.descricao_original,
      descricao: s.descricao,
      valor: s.valor,
      categoria_id: s.categoria_id ?? null,
      fornecedor_id: s.fornecedor_id ?? null,
      forma_pagamento: s.forma_pagamento,
      arquivo_origem_id: anexoId,
      obrigacao_id: s.obrigacao_id ?? null,
    });
    if (!error) inseridas++;
  }

  await supabase.from("arquivo_anexo").update({ parsed: true }).eq("id", anexoId);
  revalidatePath("/financeiro/saidas");
  revalidatePath("/dre");
  revalidatePath("/visao-geral");
  return { ok: true, inseridas };
}

export async function salvarSaidaManual(formData: FormData): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const id = formData.get("id") as string | null;
  const payload = {
    empresa_id: empresaId,
    data: String(formData.get("data")),
    descricao_original: String(formData.get("descricao")),
    descricao: String(formData.get("descricao")),
    valor: Number(formData.get("valor")),
    categoria_id: (formData.get("categoria_id") as string) || null,
    fornecedor_id: (formData.get("fornecedor_id") as string) || null,
    forma_pagamento: String(formData.get("forma_pagamento") || "manual"),
  };

  if (id) await supabase.from("saida").update(payload).eq("id", id);
  else await supabase.from("saida").insert(payload);

  revalidatePath("/financeiro/saidas");
  revalidatePath("/dre");
  return { ok: true };
}

export async function trocarCategoria(formData: FormData): Promise<{ ok: boolean }> {
  const id = String(formData.get("id"));
  const cat = (formData.get("categoria_id") as string) || null;
  const supabase = await createClient();
  await supabase.from("saida").update({ categoria_id: cat }).eq("id", id);
  revalidatePath("/financeiro/saidas");
  revalidatePath("/dre");
  revalidatePath("/visao-geral");
  return { ok: true };
}

export async function criarCategoria(formData: FormData): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const nome = String(formData.get("nome") || "").trim();
  const grupo = String(formData.get("grupo") || "outros");
  if (!nome) return { ok: false, erro: "Nome obrigatório" };

  const { data, error } = await supabase.from("categoria_despesa")
    .insert({ empresa_id: empresaId, nome, grupo, ordem: 100 })
    .select("id").single();
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/financeiro/saidas");
  return { ok: true, id: (data as { id: string }).id };
}

export async function deletarSaida(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("saida").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/financeiro/saidas");
}
