"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarCategoria(formData: FormData): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não autenticado" };

  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "usuário sem empresa" };

  const id = formData.get("id") as string | null;
  const nome = String(formData.get("nome") || "").trim();
  const grupo = String(formData.get("grupo") || "outros");
  if (!nome) return { ok: false, erro: "nome obrigatório" };

  if (id) {
    const { error } = await supabase.from("categoria_despesa")
      .update({ nome, grupo }).eq("id", id);
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/financeiro/categorias");
    return { ok: true, id };
  } else {
    const { data, error } = await supabase.from("categoria_despesa")
      .insert({ empresa_id: empresaId, nome, grupo, ordem: 100, ativa: true })
      .select("id").single();
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/financeiro/categorias");
    revalidatePath("/financeiro/saidas");
    return { ok: true, id: (data as { id: string }).id };
  }
}

export async function deletarCategoria(formData: FormData): Promise<{ ok: boolean }> {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  // soft delete via deleted_at
  await supabase.from("categoria_despesa").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/financeiro/categorias");
  revalidatePath("/financeiro/saidas");
  return { ok: true };
}
