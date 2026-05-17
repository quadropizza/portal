"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarMetas(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const id = String(formData.get("empresa_id"));
  const metas = {
    cmv_maximo_pct: Number(formData.get("cmv_maximo_pct")),
    despesas_maximo_pct: Number(formData.get("despesas_maximo_pct")),
    ticket_medio_meta: Number(formData.get("ticket_medio_meta")),
    pro_labore_max_pct_receita: Number(formData.get("pro_labore_max_pct_receita")),
    validade_pizza_pronta_dias: Number(formData.get("validade_pizza_pronta_dias") || 10),
  };
  await supabase.from("empresa").update({ metas }).eq("id", id);
  revalidatePath("/configuracoes");
  revalidatePath("/visao-geral");
  return { ok: true };
}

export async function salvarChecklistItem(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false };

  const id = formData.get("id") as string | null;
  const payload: any = {
    empresa_id: empresaId,
    ordem: Number(formData.get("ordem")),
    titulo: String(formData.get("titulo")),
    descricao: (formData.get("descricao") as string) || null,
    dia_do_mes: formData.get("dia_do_mes") ? Number(formData.get("dia_do_mes")) : null,
    ativo: formData.get("ativo") === "1",
  };
  if (id) await supabase.from("template_organizacao").update(payload).eq("id", id);
  else await supabase.from("template_organizacao").insert(payload);
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function deletarChecklistItem(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("template_organizacao").delete().eq("id", id);
  revalidatePath("/configuracoes");
}
