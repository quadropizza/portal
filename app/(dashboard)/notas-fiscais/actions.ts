"use server";

import { createClient } from "@/lib/supabase/server";
import { parseNfeXml } from "@/lib/parsers/nfe-xml";
import { revalidatePath } from "next/cache";

export async function uploadNfe(formData: FormData): Promise<{ ok: boolean; erro?: string; obrigacao_id?: string; resumo?: { fornecedor: string; valor: number; itens: number; tipo: string } }> {
  const file = formData.get("arquivo") as File | null;
  if (!file) return { ok: false, erro: "Sem arquivo" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const nome = file.name.toLowerCase();
  const isXml = nome.endsWith(".xml");
  const isPdf = nome.endsWith(".pdf");
  const isImg = /\.(jpe?g|png|webp)$/i.test(nome);

  if (!isXml && !isPdf && !isImg) {
    return { ok: false, erro: "Formato não suportado. Aceito: XML (NF-e), PDF (DARF/FGTS/Boleto), JPEG/PNG (foto de boleto)." };
  }

  // Upload pro Storage
  const buf = Buffer.from(await file.arrayBuffer());
  const caminho = `${empresaId}/${isXml ? "nfe" : "boleto"}/${Date.now()}-${file.name}`;
  const mime = isXml ? "application/xml" : isPdf ? "application/pdf" : "image/jpeg";
  const { error: upErr } = await supabase.storage.from("anexos").upload(caminho, buf, { contentType: mime });
  if (upErr) return { ok: false, erro: `Storage: ${upErr.message}` };

  const { data: anexo } = await supabase.from("arquivo_anexo")
    .insert({ empresa_id: empresaId, bucket: isXml ? "nfe" : "boleto", caminho,
              nome_original: file.name, mime_type: mime, tamanho_bytes: file.size, parsed: false })
    .select("id").single();
  const anexoId = (anexo as { id: string }).id;

  // Se for XML: parseia automaticamente e cria obrigação completa
  if (isXml) {
    const xml = buf.toString("utf8");
    const parsed = parseNfeXml(xml);
    if (!parsed.chave_acesso) {
      return { ok: false, erro: "XML enviado mas não é NF-e válida (sem chave de acesso)." };
    }

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

    const duplicatas = parsed.duplicatas.length > 0
      ? parsed.duplicatas
      : [{ numero: "1", vencimento: parsed.data_emissao ?? new Date().toISOString().split("T")[0], valor: parsed.valor_total ?? 0 }];

    let primeiraObrigId: string | null = null;
    for (const d of duplicatas) {
      const { data: obrig } = await supabase.from("obrigacao_a_pagar").insert({
        empresa_id: empresaId, tipo: "nf_fornecedor", fornecedor_id: fornecedorId,
        numero: `${parsed.numero ?? ""}${duplicatas.length > 1 ? `-${d.numero}` : ""}`,
        serie: parsed.serie, chave_acesso: parsed.chave_acesso,
        data_emissao: parsed.data_emissao, data_vencimento: d.vencimento || parsed.data_emissao,
        valor_total: d.valor, arquivo_xml_id: anexoId, parsed: true,
      }).select("id").single();
      const obrigId = (obrig as { id: string } | null)?.id;
      if (!obrigId) continue;
      if (!primeiraObrigId) primeiraObrigId = obrigId;
      if (primeiraObrigId === obrigId && parsed.items.length > 0) {
        await supabase.from("obrigacao_item").insert(
          parsed.items.map((it) => ({
            obrigacao_id: obrigId, descricao_original: it.descricao, ncm: it.ncm,
            quantidade: it.qtd, unidade: it.unidade, valor_unitario: it.valor_unitario, valor_total: it.valor_total,
          }))
        );
      }
    }

    revalidatePath("/notas-fiscais");
    return {
      ok: true, obrigacao_id: primeiraObrigId ?? undefined,
      resumo: { fornecedor: parsed.fornecedor.nome ?? "—", valor: parsed.valor_total ?? 0, itens: parsed.items.length, tipo: "NF-e XML" },
    };
  }

  // PDF/IMG: tenta extrair texto ou usar OCR
  const tipoPalpite = nome.includes("darf") ? "tributo"
                    : nome.includes("fgts") ? "encargo_trabalhista"
                    : "boleto_avulso";

  let valor = 0;
  let vencimento = new Date().toISOString().split("T")[0];
  let numero: string | null = null;
  let competencia: string | null = null;
  let fornecedorCnpj: string | null = null;
  let fornecedorNome: string | null = null;
  let analiseOk = false;
  let detalhe = "";

  try {
    if (isPdf) {
      // 1. Tenta extrair texto direto (boleto Ivanor funciona, DARF/FGTS retorna vazio)
      const { extractPdfText } = await import("@/lib/pdf-extract");
      const texto = await extractPdfText(buf);

      if (texto.length > 500) {
        // PDF com texto — usar parser de boleto
        const { parseBoletoPdf } = await import("@/lib/parsers/boleto-pdf");
        const b = parseBoletoPdf(texto);
        if (b.valor) valor = b.valor;
        if (b.vencimento) vencimento = b.vencimento;
        if (b.numero) numero = b.numero;
        if (b.fornecedor_cnpj) fornecedorCnpj = b.fornecedor_cnpj;
        if (b.fornecedor_nome) fornecedorNome = b.fornecedor_nome;
        if (b.valor) { analiseOk = true; detalhe = "parser boleto (texto)"; }
      }

      if (!analiseOk) {
        // PDF imagem (DARF/FGTS) — usa Vision
        const { ocrPdfImagem } = await import("@/lib/ocr-vision");
        const r = await ocrPdfImagem(buf);
        if (r.ok) {
          if (r.valor) valor = r.valor;
          if (r.vencimento) vencimento = r.vencimento;
          if (r.numero) numero = r.numero;
          if (r.competencia) competencia = r.competencia;
          if (r.fornecedor_cnpj) fornecedorCnpj = r.fornecedor_cnpj;
          if (r.fornecedor_nome) fornecedorNome = r.fornecedor_nome;
          analiseOk = true; detalhe = "OCR via Vision (PDF imagem)";
        } else {
          detalhe = `Sem extração automática: ${r.erro}`;
        }
      }
    } else if (isImg) {
      // Foto — Vision
      const { ocrImagem } = await import("@/lib/ocr-vision");
      const r = await ocrImagem(buf, mime);
      if (r.ok) {
        if (r.valor) valor = r.valor;
        if (r.vencimento) vencimento = r.vencimento;
        if (r.numero) numero = r.numero;
        if (r.fornecedor_cnpj) fornecedorCnpj = r.fornecedor_cnpj;
        if (r.fornecedor_nome) fornecedorNome = r.fornecedor_nome;
        analiseOk = true; detalhe = "OCR via Vision (foto)";
      } else {
        detalhe = `Sem extração automática: ${r.erro}`;
      }
    }
  } catch (e) {
    detalhe = `Erro: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Cadastra fornecedor se não existe
  let fornecedorId: string | null = null;
  if (fornecedorCnpj) {
    const cnpj = fornecedorCnpj.replace(/\D/g, "");
    const { data: existente } = await supabase.from("fornecedor")
      .select("id").eq("empresa_id", empresaId).eq("cnpj", cnpj).maybeSingle();
    if (existente) fornecedorId = (existente as { id: string }).id;
    else if (fornecedorNome) {
      const { data: novo } = await supabase.from("fornecedor")
        .insert({ empresa_id: empresaId, cnpj, nome: fornecedorNome })
        .select("id").single();
      fornecedorId = (novo as { id: string } | null)?.id ?? null;
    }
  }

  const { data: obrig } = await supabase.from("obrigacao_a_pagar").insert({
    empresa_id: empresaId, tipo: tipoPalpite, fornecedor_id: fornecedorId,
    data_vencimento: vencimento, valor_total: valor, numero, competencia,
    arquivo_pdf_id: anexoId, parsed: analiseOk,
    observacoes: `${file.name} · ${detalhe}`,
  }).select("id").single();
  const obrigId = (obrig as { id: string } | null)?.id;

  revalidatePath("/notas-fiscais");
  return {
    ok: true, obrigacao_id: obrigId,
    resumo: {
      fornecedor: fornecedorNome ?? file.name,
      valor, itens: 0,
      tipo: analiseOk ? `${tipoPalpite} · ${detalhe}` : `${tipoPalpite} · preencher manualmente`,
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
    categoria_id: (formData.get("categoria_id") as string) || null,
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

export async function pagarObrigacao(formData: FormData): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const id = String(formData.get("id"));
  const forma = String(formData.get("forma"));

  const { data: obrig } = await supabase.from("obrigacao_a_pagar")
    .select("*, fornecedor:fornecedor(id, nome, apelido)").eq("id", id).maybeSingle();
  if (!obrig) return { ok: false, erro: "obrigação não encontrada" };
  const o = obrig as any;
  if (!o.categoria_id) return { ok: false, erro: "categoria obrigatória pra pagar" };

  const restante = Number(o.valor_total) - Number(o.valor_pago);
  if (restante <= 0) return { ok: false, erro: "já pago" };

  const desc = `Pgto ${o.tipo === "nf_fornecedor" ? "NF" : o.tipo === "boleto_avulso" ? "Boleto" : o.tipo} ${o.numero ?? ""} · ${o.fornecedor?.apelido ?? o.fornecedor?.nome ?? ""}`.trim();

  await supabase.from("saida").insert({
    empresa_id: empresaId,
    data: new Date().toISOString().split("T")[0],
    descricao_original: desc, descricao: desc,
    valor: restante,
    categoria_id: o.categoria_id, fornecedor_id: o.fornecedor_id,
    forma_pagamento: forma, obrigacao_id: id,
  });

  revalidatePath("/notas-fiscais");
  revalidatePath("/financeiro/saidas");
  revalidatePath("/dre");
  revalidatePath("/visao-geral");
  return { ok: true };
}

export async function deletarObrigacao(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("obrigacao_a_pagar").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/notas-fiscais");
}
