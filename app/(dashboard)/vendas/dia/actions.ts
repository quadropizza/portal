"use server";

import { createClient } from "@/lib/supabase/server";
import { parsePdvText, type ParseResult } from "@/lib/parsers/pdv-pdf";
import { revalidatePath } from "next/cache";

/**
 * Sobe o PDF do Fast Report, parseia, persiste em venda_individual
 * + venda_individual_item, e agrega em venda_diaria.
 * Idempotente — unique (empresa_id, pdv_id, data_hora) evita duplicar.
 *
 * O parsing roda no servidor (Node runtime) usando pdf-parse.
 */
export async function uploadEParse(formData: FormData): Promise<{
  ok: boolean;
  resumo?: {
    vendas_inseridas: number;
    vendas_ignoradas: number; // já existiam
    periodo: { inicio: string | null; fim: string | null };
    faturamento_total: number;
    produtos_sem_cadastro: { codigo: string; nome: string; qtd: number }[];
  };
  erro?: string;
}> {
  const file = formData.get("arquivo") as File | null;
  if (!file) return { ok: false, erro: "Nenhum arquivo enviado." };
  if (file.type !== "application/pdf") return { ok: false, erro: "Só aceita PDF." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado." };

  const { data: u } = await supabase
    .from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "Usuário sem empresa." };

  // 1. Sobe pro Storage
  const buf = Buffer.from(await file.arrayBuffer());
  const caminho = `${empresaId}/pdv/${Date.now()}-${file.name}`;
  const { error: upErr } = await supabase.storage
    .from("anexos")
    .upload(caminho, buf, { contentType: "application/pdf", upsert: false });
  if (upErr) return { ok: false, erro: `Storage: ${upErr.message}` };

  // 2. Registra arquivo_anexo
  const { data: anexo, error: anexoErr } = await supabase
    .from("arquivo_anexo")
    .insert({
      empresa_id: empresaId,
      bucket: "pdv",
      caminho,
      nome_original: file.name,
      mime_type: file.type,
      tamanho_bytes: file.size,
      parsed: false,
    })
    .select("id")
    .single();
  if (anexoErr) return { ok: false, erro: `Anexo: ${anexoErr.message}` };
  const anexoId = (anexo as { id: string }).id;

  // 3. Parseia
  let parsed: ParseResult;
  let textoBruto = "";
  try {
    const { extractPdfText } = await import("@/lib/pdf-extract");
    textoBruto = await extractPdfText(buf);
    parsed = parsePdvText(textoBruto);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("arquivo_anexo")
      .update({ parsing_erro: msg }).eq("id", anexoId);
    return { ok: false, erro: `Erro ao ler PDF: ${msg}. Tente reexportar do Fast Report.` };
  }

  if (parsed.vendas.length === 0) {
    const preview = textoBruto.slice(0, 300).replace(/\n/g, " ").trim();
    await supabase.from("arquivo_anexo")
      .update({ parsing_erro: `Nenhuma venda no PDF. Texto extraído: ${preview.slice(0,200)}` }).eq("id", anexoId);
    return {
      ok: false,
      erro: `PDF lido (${textoBruto.length} chars) mas não achei vendas. Preview: "${preview.slice(0,150)}..."  ·  Confira se é "Relatório de venda detalhada" do Fast Report (status EFETIVADAS).`,
    };
  }

  // 4. Mapa de produtos cadastrados (por codigo)
  const { data: produtos } = await supabase
    .from("produto").select("id, codigo").eq("empresa_id", empresaId);
  const codToId = new Map<string, string>(
    ((produtos ?? []) as Array<{ id: string; codigo: string }>)
      .map((p) => [p.codigo, p.id])
  );

  // 5. Identificar duplicatas (idempotência)
  const pdvIds = parsed.vendas.map((v) => v.pdv_id);
  const { data: existentes } = await supabase
    .from("venda_individual")
    .select("pdv_id")
    .eq("empresa_id", empresaId)
    .in("pdv_id", pdvIds);
  const jaExiste = new Set<string>(
    ((existentes ?? []) as Array<{ pdv_id: string }>).map((e) => e.pdv_id),
  );

  // 6. Inserir vendas novas — em LOTES (bulk), não uma a uma.
  //    Relatório do mês inteiro tem ~1400 vendas; insert sequencial estourava
  //    o timeout da function no Vercel. Geramos o UUID aqui pra montar os items
  //    sem precisar do retorno de cada insert.
  const novas = parsed.vendas.filter((v) => !jaExiste.has(v.pdv_id));
  const produtosSemCadastro = new Map<string, { codigo: string; nome: string; qtd: number }>();

  const CHUNK = 500;
  function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  // Monta linhas de venda (com id gerado) e de items numa passada só.
  const vendaRows: Array<{
    id: string; empresa_id: string; pdv_id: string; data_hora: string;
    total: number; forma_pagamento: string | null; arquivo_origem_id: string;
  }> = [];
  const itemRows: Array<{
    venda_individual_id: string; produto_id: string | null;
    produto_codigo_origem: string; produto_nome_origem: string;
    quantidade: number; valor_unitario: number | null; valor_total: number;
  }> = [];

  for (const v of novas) {
    const vendaId = crypto.randomUUID();
    vendaRows.push({
      id: vendaId,
      empresa_id: empresaId,
      pdv_id: v.pdv_id,
      data_hora: v.data_hora,
      total: v.total,
      forma_pagamento: v.forma_pagamento,
      arquivo_origem_id: anexoId,
    });
    for (const it of v.items) {
      const prodId = codToId.get(it.codigo) ?? null;
      if (!prodId) {
        const cur = produtosSemCadastro.get(it.codigo);
        produtosSemCadastro.set(it.codigo, {
          codigo: it.codigo,
          nome: it.nome,
          qtd: (cur?.qtd ?? 0) + it.qtd,
        });
      }
      itemRows.push({
        venda_individual_id: vendaId,
        produto_id: prodId,
        produto_codigo_origem: it.codigo,
        produto_nome_origem: it.nome,
        quantidade: it.qtd,
        valor_unitario: it.qtd > 0 ? it.total / it.qtd : null,
        valor_total: it.total,
      });
    }
  }

  // Insere vendas em lotes. Se um lote falhar, aborta com mensagem clara.
  let inseridas = 0;
  for (const lote of chunk(vendaRows, CHUNK)) {
    const { error: vendaErr } = await supabase.from("venda_individual").insert(lote);
    if (vendaErr) {
      await supabase.from("arquivo_anexo")
        .update({ parsing_erro: `Insert vendas: ${vendaErr.message}` }).eq("id", anexoId);
      return { ok: false, erro: `Erro ao gravar vendas: ${vendaErr.message}` };
    }
    inseridas += lote.length;
  }

  // Insere items em lotes (só depois das vendas — FK).
  for (const lote of chunk(itemRows, CHUNK)) {
    const { error: itemErr } = await supabase.from("venda_individual_item").insert(lote);
    if (itemErr) {
      await supabase.from("arquivo_anexo")
        .update({ parsing_erro: `Insert items: ${itemErr.message}` }).eq("id", anexoId);
      return { ok: false, erro: `Erro ao gravar itens das vendas: ${itemErr.message}` };
    }
  }

  // 7. Agregar venda_diaria por data
  const porDia = new Map<string, { qtd: number; fat: number; pix: number; debito: number; credito: number; dinheiro: number; voucher: number; outros: number }>();
  for (const v of parsed.vendas) {
    const dia = v.data_hora.split("T")[0];
    const agg = porDia.get(dia) ?? { qtd: 0, fat: 0, pix: 0, debito: 0, credito: 0, dinheiro: 0, voucher: 0, outros: 0 };
    agg.qtd++;
    agg.fat += v.total;
    if (v.forma_pagamento === "PIX") agg.pix += v.total;
    else if (v.forma_pagamento === "Cartão de débito") agg.debito += v.total;
    else if (v.forma_pagamento === "Cartão de crédito") agg.credito += v.total;
    else if (v.forma_pagamento === "Dinheiro") agg.dinheiro += v.total;
    else if (v.forma_pagamento === "Voucher") agg.voucher += v.total;
    else agg.outros += v.total;
    porDia.set(dia, agg);
  }
  const diariasRows = [...porDia.entries()].map(([dia, agg]) => ({
    empresa_id: empresaId,
    data: dia,
    qtd_vendas: agg.qtd,
    faturamento_bruto: agg.fat,
    pagamento_dinheiro: agg.dinheiro,
    pagamento_pix: agg.pix,
    pagamento_cartao_credito: agg.credito,
    pagamento_cartao_debito: agg.debito,
    pagamento_voucher: agg.voucher,
    pagamento_outros: agg.outros,
    arquivo_origem_id: anexoId,
  }));
  if (diariasRows.length > 0) {
    await supabase.from("venda_diaria")
      .upsert(diariasRows, { onConflict: "empresa_id,data" });
  }

  // 8. Marca anexo como parsed
  await supabase.from("arquivo_anexo")
    .update({ parsed: true })
    .eq("id", anexoId);

  revalidatePath("/vendas/dia");
  revalidatePath("/vendas/dashboard");
  revalidatePath("/visao-geral");

  return {
    ok: true,
    resumo: {
      vendas_inseridas: inseridas,
      vendas_ignoradas: parsed.vendas.length - inseridas,
      periodo: parsed.periodo,
      faturamento_total: parsed.vendas.reduce((s, v) => s + v.total, 0),
      produtos_sem_cadastro: [...produtosSemCadastro.values()].sort((a, b) => b.qtd - a.qtd),
    },
  };
}
