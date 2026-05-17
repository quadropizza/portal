"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function lancarMovimentoInsumo(formData: FormData): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const tipo = String(formData.get("tipo"));
  const data = String(formData.get("data"));
  const obs = (formData.get("observacao") as string) || null;
  const itens = JSON.parse(String(formData.get("itens"))) as Array<{ insumo_id: string; quantidade: number; custo_unitario?: number | null }>;

  for (const it of itens) {
    let qty = it.quantidade;

    // perda = sempre negativo
    if (tipo === "perda") qty = -Math.abs(qty);

    // contagem_inicial: ajuste pra alcançar a quantidade contada
    if (tipo === "contagem_inicial") {
      const { data: mov } = await supabase
        .from("estoque_insumo_movimento")
        .select("quantidade")
        .eq("insumo_id", it.insumo_id)
        .is("deleted_at", null);
      const atual = (mov ?? []).reduce((s: number, m: any) => s + Number(m.quantidade), 0);
      qty = it.quantidade - atual;
    }

    await supabase.from("estoque_insumo_movimento").insert({
      empresa_id: empresaId,
      data_hora: new Date(data).toISOString(),
      insumo_id: it.insumo_id,
      tipo,
      quantidade: qty,
      custo_unitario: it.custo_unitario ?? null,
      observacao: obs,
    });
  }
  revalidatePath("/estoque/insumos");
  revalidatePath("/estoque/insumos/movimentar");
  revalidatePath("/estoque/fechamento");
  return { ok: true };
}
