"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function lancarMovimentoBebida(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false };

  const tipo = String(formData.get("tipo"));
  const data = String(formData.get("data"));
  const obs = (formData.get("observacao") as string) || null;
  const itens = JSON.parse(String(formData.get("itens"))) as Array<{ produto_id: string; quantidade: number }>;

  for (const it of itens) {
    let qty = it.quantidade;
    // perda = negativo
    if (tipo === "perda") qty = -Math.abs(qty);
    // contagem_inicial: zera o saldo atual e seta o novo
    if (tipo === "contagem_inicial") {
      const { data: saldo } = await supabase.from("bebida_saldo").select("saldo").eq("produto_id", it.produto_id).maybeSingle();
      const atual = (saldo as { saldo?: number } | null)?.saldo ?? 0;
      qty = it.quantidade - atual; // ajuste pra alcançar a qtd contada
    }
    await supabase.from("estoque_bebida_movimento").insert({
      empresa_id: empresaId,
      data_hora: new Date(data).toISOString(),
      produto_id: it.produto_id,
      tipo,
      quantidade: qty,
      observacao: obs ?? (tipo === "contagem_inicial" ? "Contagem inicial" : null),
    });
  }
  revalidatePath("/estoque/bebidas");
  return { ok: true };
}
