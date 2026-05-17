"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarProduto(formData: FormData): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado." };

  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "Sem empresa." };

  const id = formData.get("id") as string | null;
  const payload = {
    empresa_id: empresaId,
    codigo: String(formData.get("codigo") || "").trim(),
    nome: String(formData.get("nome") || "").trim(),
    categoria: String(formData.get("categoria") || "outro"),
    preco_venda: formData.get("preco_venda") ? Number(formData.get("preco_venda")) : null,
    produzido_em_lote: formData.get("produzido_em_lote") === "1",
    ativo: formData.get("ativo") === "1",
  };

  if (!payload.codigo || !payload.nome) return { ok: false, erro: "Código e nome são obrigatórios." };

  if (id) {
    const { error } = await supabase.from("produto").update(payload).eq("id", id);
    if (error) return { ok: false, erro: error.message };
  } else {
    const { data, error } = await supabase.from("produto").insert(payload).select("id").single();
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/catalogo/produtos");
    return { ok: true, id: (data as { id: string }).id };
  }

  revalidatePath("/catalogo/produtos");
  return { ok: true, id: id! };
}

export async function deletarProduto(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("produto").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/catalogo/produtos");
}
