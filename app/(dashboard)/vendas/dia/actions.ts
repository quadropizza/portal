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
  try {
    // dynamic import — pdf-parse só carrega no servidor
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buf);
    parsed = parsePdvText(data.text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("arquivo_anexo")
      .update({ parsing_erro: msg }).eq("id", anexoId);
    return { ok: false, erro: `Parse: ${msg}` };
  }

  if (parsed.vendas.length === 0) {
    await supabase.from("arquivo_anexo")
      .update({ parsing_erro: "Nenhuma venda detectada no PDF." }).eq("id", anexoId);
    return { ok: false, erro: "Nenhuma venda detectada — confira se é PDF do Fast Report." };
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

  // 6. Inserir vendas novas
  const novas = parsed.vendas.filter((v) => !jaExiste.has(v.pdv_id));
  let inseridas = 0;
  const produtosSemCadastro = new Map<string, { codigo: string; nome: string; qtd: number }>();

  for (const v of novas) {
    const { data: vendaIns, error: vendaErr } = await supabase
      .from("venda_individual")
      .insert({
        empresa_id: empresaId,
        pdv_id: v.pdv_id,
        data_hora: v.data_hora,
        total: v.total,
        forma_pagamento: v.forma_pagamento,
        arquivo_origem_id: anexoId,
      })
      .select("id")
      .single();
    if (vendaErr) continue;
    const vendaId = (vendaIns as { id: string }).id;

    // Items
    if (v.items.length > 0) {
      const itemRows = v.items.map((it) => {
        const prodId = codToId.get(it.codigo) ?? null;
        if (!prodId) {
          const cur = produtosSemCadastro.get(it.codigo);
          produtosSemCadastro.set(it.codigo, {
            codigo: it.codigo,
            nome: it.nome,
            qtd: (cur?.qtd ?? 0) + it.qtd,
          });
        }
        return {
          venda_individual_id: vendaId,
          produto_id: prodId,
          produto_codigo_origem: it.codigo,
          produto_nome_origem: it.nome,
          quantidade: it.qtd,
          valor_unitario: it.qtd > 0 ? it.total / it.qtd : null,
          valor_total: it.total,
        };
      });
      await supabase.from("venda_individual_item").insert(itemRows);
    }
    inseridas++;
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
  for (const [dia, agg] of porDia.entries()) {
    await supabase.from("venda_diaria")
      .upsert({
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
      }, { onConflict: "empresa_id,data" });
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
