"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarCustoFixo(formData: FormData): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const id = formData.get("id") as string | null;
  const payload = {
    empresa_id: empresaId,
    nome: String(formData.get("nome") || "").trim(),
    valor_estimado: Number(formData.get("valor")),
    dia_vencimento: formData.get("dia") ? Number(formData.get("dia")) : null,
    categoria_id: (formData.get("categoria_id") as string) || null,
    fornecedor_id: (formData.get("fornecedor_id") as string) || null,
    forma_pagamento: String(formData.get("forma") || "pix"),
    ativo: formData.get("ativo") === "1",
  };
  if (!payload.nome) return { ok: false, erro: "Nome obrigatório" };

  if (id) await supabase.from("custo_fixo").update(payload).eq("id", id);
  else await supabase.from("custo_fixo").insert(payload);

  revalidatePath("/financeiro/custos-fixos");
  return { ok: true };
}

export async function marcarCustoPago(formData: FormData): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const custoId = String(formData.get("custo_id"));
  const valor = Number(formData.get("valor"));
  const data = String(formData.get("data"));
  const forma = String(formData.get("forma") || "pix");
  const ano = Number(formData.get("ano"));
  const mes = Number(formData.get("mes"));

  const { data: c } = await supabase.from("custo_fixo")
    .select("nome, categoria_id, fornecedor_id").eq("id", custoId).maybeSingle();
  if (!c) return { ok: false, erro: "custo fixo não encontrado" };
  const custo = c as any;

  // Gera saída
  const { data: saida } = await supabase.from("saida").insert({
    empresa_id: empresaId,
    data,
    descricao_original: `Custo fixo: ${custo.nome}`,
    descricao: custo.nome,
    valor,
    categoria_id: custo.categoria_id,
    fornecedor_id: custo.fornecedor_id,
    forma_pagamento: forma,
  }).select("id").single();
  const saidaId = (saida as { id: string }).id;

  // Registra pagamento
  await supabase.from("custo_fixo_pagamento").upsert({
    custo_fixo_id: custoId, ano, mes, valor_pago: valor, data_pagamento: data, saida_id: saidaId,
  }, { onConflict: "custo_fixo_id,ano,mes" });

  revalidatePath("/financeiro/custos-fixos");
  revalidatePath("/financeiro/saidas");
  revalidatePath("/dre");
  revalidatePath("/visao-geral");
  return { ok: true };
}

export async function desfazerPagamento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("pagamento_id"));
  const { data: pag } = await supabase.from("custo_fixo_pagamento").select("saida_id").eq("id", id).maybeSingle();
  if (pag && (pag as any).saida_id) {
    await supabase.from("saida").update({ deleted_at: new Date().toISOString() }).eq("id", (pag as any).saida_id);
  }
  await supabase.from("custo_fixo_pagamento").delete().eq("id", id);
  revalidatePath("/financeiro/custos-fixos");
  revalidatePath("/financeiro/saidas");
}

export async function sugerirSaidaParaCusto(custoId: string): Promise<{ saida_id: string | null; saida_data: string | null; saida_desc: string | null; saida_valor: number | null; motivo: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("sugerir_saida_para_custo", { p_custo: custoId });
  const r = ((data ?? []) as any[])[0];
  return r ?? { saida_id: null, saida_data: null, saida_desc: null, saida_valor: null, motivo: null };
}

export async function vincularSaidaAoCusto(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const custoId = String(formData.get("custo_id"));
  const saidaId = String(formData.get("saida_id"));
  const ano = Number(formData.get("ano"));
  const mes = Number(formData.get("mes"));

  const { data: s } = await supabase.from("saida").select("data, valor").eq("id", saidaId).maybeSingle();
  if (!s) return { ok: false };
  const saida = s as any;
  await supabase.from("custo_fixo_pagamento").upsert({
    custo_fixo_id: custoId, ano, mes,
    valor_pago: saida.valor, data_pagamento: saida.data, saida_id: saidaId,
  }, { onConflict: "custo_fixo_id,ano,mes" });

  revalidatePath("/financeiro/custos-fixos");
  revalidatePath("/financeiro/saidas");
  return { ok: true };
}

export async function deletarCustoFixo(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("custo_fixo").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/financeiro/custos-fixos");
}
