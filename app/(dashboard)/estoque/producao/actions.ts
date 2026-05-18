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
  const itens = JSON.parse(String(formData.get("itens") ?? "[]")) as Array<{ produto_id: string; quantidade: number }>;
  const itensMassa = JSON.parse(String(formData.get("itensMassa") ?? "[]")) as Array<{ insumo_id: string; quantidade: number }>;

  const { data: lote } = await supabase.from("producao_lote")
    .insert({ empresa_id: empresaId, data, produtor_nome: produtor, observacoes: obs })
    .select("id").single();
  const loteId = (lote as { id: string }).id;

  if (itens.length > 0) {
    // Trigger aplicar_producao baixa insumos via ficha técnica + entrada de pizza pronta
    await supabase.from("producao_lote_item").insert(
      itens.map((it) => ({ producao_lote_id: loteId, produto_id: it.produto_id, quantidade: it.quantidade }))
    );
  }

  if (itensMassa.length > 0) {
    await supabase.from("estoque_insumo_movimento").insert(
      itensMassa.map((it) => ({
        empresa_id: empresaId,
        data_hora: new Date(data).toISOString(),
        insumo_id: it.insumo_id,
        tipo: "producao",
        quantidade: it.quantidade,
        custo_unitario: 0,
        origem_tipo: "producao",
        origem_id: loteId,
        observacao: `Massa produzida (lote ${data})`,
      }))
    );
  }

  revalidatePath("/estoque/producao");
  revalidatePath("/estoque/insumos");
  revalidatePath("/estoque/contagem-pizza");
  return { ok: true };
}
