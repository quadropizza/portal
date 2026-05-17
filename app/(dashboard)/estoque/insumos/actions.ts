"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarInsumo(formData: FormData): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const id = formData.get("id") as string | null;
  const custoManual = formData.get("custo_medio_atual") as string | null;
  const payload: any = {
    empresa_id: empresaId,
    nome: String(formData.get("nome") || "").trim(),
    unidade_padrao: String(formData.get("unidade") || "kg"),
    ativo: formData.get("ativo") === "1",
  };
  if (custoManual) {
    payload.custo_medio_atual = Number(custoManual);
    payload.custo_origem = "manual";
  }

  if (id) {
    const { error } = await supabase.from("insumo").update(payload).eq("id", id);
    if (error) return { ok: false, erro: error.message };
  } else {
    payload.custo_origem = custoManual ? "manual" : "seed";
    const { data, error } = await supabase.from("insumo").insert(payload).select("id").single();
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/estoque/insumos");
    return { ok: true, id: (data as { id: string }).id };
  }
  revalidatePath("/estoque/insumos");
  return { ok: true, id: id! };
}

export async function deletarInsumo(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("insumo").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/estoque/insumos");
}
