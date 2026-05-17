"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarComponentes(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const comboId = String(formData.get("combo_id"));
  const componentes = JSON.parse(String(formData.get("componentes"))) as Array<{ produto_id: string; quantidade: number }>;

  await supabase.from("combo_componente").delete().eq("combo_id", comboId);
  if (componentes.length > 0) {
    await supabase.from("combo_componente").insert(
      componentes.map((c) => ({ combo_id: comboId, produto_id: c.produto_id, quantidade: c.quantidade }))
    );
  }
  revalidatePath("/catalogo/produtos");
  revalidatePath(`/catalogo/combos/${comboId}`);
  return { ok: true };
}

export async function salvarComboCompleto(formData: FormData): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const id = formData.get("id") as string | null;
  const payload = {
    empresa_id: empresaId,
    codigo: String(formData.get("codigo") || "").trim(),
    nome: String(formData.get("nome") || "").trim(),
    categoria: "combo",
    preco_venda: Number(formData.get("preco") || 0),
    produzido_em_lote: false,
    ativo: true,
  };
  const componentes = JSON.parse(String(formData.get("componentes"))) as Array<{ produto_id: string; quantidade: number }>;

  let comboId: string;
  if (id) {
    const { error } = await supabase.from("produto").update(payload).eq("id", id);
    if (error) return { ok: false, erro: error.message };
    comboId = id;
  } else {
    const { data, error } = await supabase.from("produto").insert(payload).select("id").single();
    if (error) return { ok: false, erro: error.message };
    comboId = (data as { id: string }).id;
  }

  await supabase.from("combo_componente").delete().eq("combo_id", comboId);
  if (componentes.length > 0) {
    await supabase.from("combo_componente").insert(
      componentes.map((c) => ({ combo_id: comboId, produto_id: c.produto_id, quantidade: c.quantidade }))
    );
  }
  revalidatePath("/catalogo/produtos");
  revalidatePath(`/catalogo/combos/${comboId}`);
  return { ok: true, id: comboId };
}

export async function deletarCombo(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("combo_componente").delete().eq("combo_id", id);
  await supabase.from("produto").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/catalogo/produtos");
}
