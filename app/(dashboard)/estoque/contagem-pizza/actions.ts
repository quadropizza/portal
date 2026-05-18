"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarContagemPizza(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false };

  const data = String(formData.get("data"));
  const obs = formData.get("observacoes") as string | null;
  const itens = JSON.parse(String(formData.get("itens") ?? "[]")) as Array<{ produto_id: string; quantidade_contada: number }>;
  const itensMassa = JSON.parse(String(formData.get("itensMassa") ?? "[]")) as Array<{ insumo_id: string; quantidade_contada: number }>;

  const { data: cont } = await supabase.from("contagem")
    .insert({ empresa_id: empresaId, data, tipo: "pizza", observacoes: obs })
    .select("id").single();
  const contagemId = (cont as { id: string }).id;

  for (const it of itens) {
    const { data: mov } = await supabase
      .from("estoque_pizza_movimento")
      .select("quantidade")
      .eq("produto_id", it.produto_id);
    const esperado = (mov ?? []).reduce((s: number, m: any) => s + Number(m.quantidade), 0);
    const divergencia = it.quantidade_contada - esperado;

    await supabase.from("contagem_item").insert({
      contagem_id: contagemId,
      produto_id: it.produto_id,
      quantidade_contada: it.quantidade_contada,
      quantidade_esperada: esperado,
    });

    if (Math.abs(divergencia) > 0) {
      await supabase.from("estoque_pizza_movimento").insert({
        empresa_id: empresaId,
        data_hora: new Date(data).toISOString(),
        produto_id: it.produto_id,
        tipo: "ajuste_contagem",
        quantidade: divergencia,
        origem_tipo: "contagem",
        origem_id: contagemId,
        observacao: `Ajuste contagem ${data}`,
      });
    }
  }

  for (const it of itensMassa) {
    const { data: mov } = await supabase
      .from("estoque_insumo_movimento")
      .select("quantidade")
      .eq("insumo_id", it.insumo_id);
    const esperado = (mov ?? []).reduce((s: number, m: any) => s + Number(m.quantidade), 0);
    const divergencia = it.quantidade_contada - esperado;

    await supabase.from("contagem_item").insert({
      contagem_id: contagemId,
      insumo_id: it.insumo_id,
      quantidade_contada: it.quantidade_contada,
      quantidade_esperada: esperado,
    });

    if (Math.abs(divergencia) > 0) {
      await supabase.from("estoque_insumo_movimento").insert({
        empresa_id: empresaId,
        data_hora: new Date(data).toISOString(),
        insumo_id: it.insumo_id,
        tipo: "ajuste_contagem",
        quantidade: divergencia,
        custo_unitario: 0,
        origem_tipo: "contagem",
        origem_id: contagemId,
        observacao: `Ajuste contagem massa ${data}`,
      });
    }
  }

  revalidatePath("/estoque/contagem-pizza");
  revalidatePath("/estoque/insumos");
  return { ok: true };
}
