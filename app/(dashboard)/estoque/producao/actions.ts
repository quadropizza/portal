"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarProducao(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false };

  const data = String(formData.get("data"));
  const produtor = (formData.get("produtor") as string) || null;
  const obs = (formData.get("observacoes") as string) || null;
  const itens = JSON.parse(String(formData.get("itens"))) as Array<{ produto_id: string; quantidade: number }>;

  const { data: lote } = await supabase.from("producao_lote")
    .insert({ empresa_id: empresaId, data, produtor_nome: produtor, observacoes: obs })
    .select("id").single();
  const loteId = (lote as { id: string }).id;

  // O trigger aplicar_producao no banco cuida de:
  // 1) inserir estoque_pizza_movimento (entrada)
  // 2) inserir estoque_insumo_movimento (saída) via ficha técnica
  await supabase.from("producao_lote_item").insert(
    itens.map((it) => ({ producao_lote_id: loteId, produto_id: it.produto_id, quantidade: it.quantidade }))
  );

  revalidatePath("/estoque/producao");
  revalidatePath("/estoque/insumos");
  return { ok: true };
}
