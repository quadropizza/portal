"use server";

import { createClient } from "@/lib/supabase/server";
import { parseNfeXml } from "@/lib/parsers/nfe-xml";
import { revalidatePath } from "next/cache";

export async function uploadNfe(formData: FormData): Promise<{ ok: boolean; erro?: string; obrigacao_id?: string; resumo?: { fornecedor: string; valor: number; itens: number } }> {
  const file = formData.get("arquivo") as File | null;
  if (!file) return { ok: false, erro: "Sem arquivo" };
  if (!file.name.toLowerCase().endsWith(".xml")) return { ok: false, erro: "Só XML de NF-e" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const xml = await file.text();
  const parsed = parseNfeXml(xml);
  if (!parsed.chave_acesso) return { ok: false, erro: "XML não parece ser NF-e (sem chave de acesso)." };

  // Upload do XML
  const caminho = `${empresaId}/nfe/${Date.now()}-${file.name}`;
  await supabase.storage.from("anexos").upload(caminho, Buffer.from(xml), { contentType: "application/xml" });
  const { data: anexo } = await supabase.from("arquivo_anexo")
    .insert({ empresa_id: empresaId, bucket: "nfe", caminho, nome_original: file.name, mime_type: "application/xml", tamanho_bytes: file.size, parsed: true })
    .select("id").single();
  const anexoId = (anexo as { id: string }).id;

  // Cadastra fornecedor se não existir
  let fornecedorId: string | null = null;
  if (parsed.fornecedor.cnpj) {
    const cnpj = parsed.fornecedor.cnpj.replace(/\D/g, "");
    const { data: existente } = await supabase.from("fornecedor")
      .select("id").eq("empresa_id", empresaId).eq("cnpj", cnpj).maybeSingle();
    if (existente) fornecedorId = (existente as { id: string }).id;
    else {
      const { data: novo } = await supabase.from("fornecedor")
        .insert({ empresa_id: empresaId, cnpj, nome: parsed.fornecedor.nome ?? "Sem nome", apelido: parsed.fornecedor.nome_fantasia ?? null })
        .select("id").single();
      fornecedorId = (novo as { id: string } | null)?.id ?? null;
    }
  }

  // Cria obrigação_a_pagar (uma por duplicata; se sem duplicata, uma só)
  const duplicatas = parsed.duplicatas.length > 0
    ? parsed.duplicatas
    : [{ numero: "1", vencimento: parsed.data_emissao ?? new Date().toISOString().split("T")[0], valor: parsed.valor_total ?? 0 }];

  let primeiraObrigId: string | null = null;
  for (const d of duplicatas) {
    const { data: obrig } = await supabase.from("obrigacao_a_pagar").insert({
      empresa_id: empresaId,
      tipo: "nf_fornecedor",
      fornecedor_id: fornecedorId,
      numero: `${parsed.numero ?? ""}${duplicatas.length > 1 ? `-${d.numero}` : ""}`,
      serie: parsed.serie,
      chave_acesso: parsed.chave_acesso,
      data_emissao: parsed.data_emissao,
      data_vencimento: d.vencimento || parsed.data_emissao,
      valor_total: d.valor,
      arquivo_xml_id: anexoId,
      parsed: true,
    }).select("id").single();
    const obrigId = (obrig as { id: string } | null)?.id;
    if (!obrigId) continue;
    if (!primeiraObrigId) primeiraObrigId = obrigId;

    // Insere os itens (na primeira só — itens não se duplicam por duplicata)
    if (primeiraObrigId === obrigId && parsed.items.length > 0) {
      const itemRows = parsed.items.map((it) => ({
        obrigacao_id: obrigId,
        descricao_original: it.descricao,
        ncm: it.ncm,
        quantidade: it.qtd,
        unidade: it.unidade,
        valor_unitario: it.valor_unitario,
        valor_total: it.valor_total,
      }));
      await supabase.from("obrigacao_item").insert(itemRows);
    }
  }

  revalidatePath("/notas-fiscais");
  return {
    ok: true,
    obrigacao_id: primeiraObrigId ?? undefined,
    resumo: {
      fornecedor: parsed.fornecedor.nome ?? "—",
      valor: parsed.valor_total ?? 0,
      itens: parsed.items.length,
    },
  };
}

export async function salvarObrigacaoManual(formData: FormData): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const id = formData.get("id") as string | null;
  const payload = {
    empresa_id: empresaId,
    tipo: String(formData.get("tipo")),
    fornecedor_id: (formData.get("fornecedor_id") as string) || null,
    numero: (formData.get("numero") as string) || null,
    data_vencimento: String(formData.get("vencimento")),
    valor_total: Number(formData.get("valor")),
    competencia: (formData.get("competencia") as string) || null,
  };
  if (id) await supabase.from("obrigacao_a_pagar").update(payload).eq("id", id);
  else await supabase.from("obrigacao_a_pagar").insert(payload);
  revalidatePath("/notas-fiscais");
  return { ok: true };
}

export async function deletarObrigacao(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("obrigacao_a_pagar").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/notas-fiscais");
}
