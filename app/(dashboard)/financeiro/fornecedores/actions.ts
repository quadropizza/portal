"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarFornecedor(formData: FormData): Promise<{ ok: boolean; erro?: string; id?: string }> {
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
    apelido: (formData.get("apelido") as string)?.trim() || null,
    cnpj: (formData.get("cnpj") as string)?.replace(/\D/g, "") || null,
    categoria_padrao_id: (formData.get("categoria_id") as string) || null,
    ativo: formData.get("ativo") === "1",
  };
  if (!payload.nome) return { ok: false, erro: "Nome é obrigatório" };

  if (id) {
    const { error } = await supabase.from("fornecedor").update(payload).eq("id", id);
    if (error) return { ok: false, erro: error.message };
  } else {
    const { data, error } = await supabase.from("fornecedor").insert(payload).select("id").single();
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/financeiro/fornecedores");
    return { ok: true, id: (data as { id: string }).id };
  }
  revalidatePath("/financeiro/fornecedores");
  return { ok: true, id: id! };
}

export async function deletarFornecedor(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("fornecedor").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/financeiro/fornecedores");
}
