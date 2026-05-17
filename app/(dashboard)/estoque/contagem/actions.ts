"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarContagem(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false };

  const data = String(formData.get("data"));
  const obs = formData.get("observacoes") as string | null;
  const itens = JSON.parse(String(formData.get("itens"))) as Array<{ insumo_id: string; quantidade_contada: number }>;

  const { data: cont } = await supabase.from("contagem")
    .insert({ empresa_id: empresaId, data, tipo: "insumo", observacoes: obs })
    .select("id").single();
  const contagemId = (cont as { id: string }).id;

  // Pra cada item, calcular esperado a partir dos movimentos
  for (const it of itens) {
    const { data: mov } = await supabase
      .from("estoque_insumo_movimento")
      .select("quantidade")
      .eq("insumo_id", it.insumo_id);
    const esperado = (mov ?? []).reduce((s: number, m: any) => s + Number(m.quantidade), 0);
    const { data: insumo } = await supabase.from("insumo")
      .select("custo_medio_atual").eq("id", it.insumo_id).maybeSingle();
    const custo = (insumo as { custo_medio_atual?: number } | null)?.custo_medio_atual ?? 0;
    const divergencia = it.quantidade_contada - esperado;

    await supabase.from("contagem_item").insert({
      contagem_id: contagemId,
      insumo_id: it.insumo_id,
      quantidade_contada: it.quantidade_contada,
      quantidade_esperada: esperado,
      valor_divergencia: Math.abs(divergencia) * Number(custo),
    });

    // Gera movimento de ajuste pra alinhar estoque com a contagem
    if (Math.abs(divergencia) > 0.001) {
      await supabase.from("estoque_insumo_movimento").insert({
        empresa_id: empresaId,
        data_hora: new Date(data).toISOString(),
        insumo_id: it.insumo_id,
        tipo: "ajuste_contagem",
        quantidade: divergencia,
        origem_tipo: "contagem",
        origem_id: contagemId,
        observacao: `Ajuste por contagem ${data}`,
      });
    }
  }

  revalidatePath("/estoque/insumos");
  revalidatePath("/estoque/contagem");
  return { ok: true };
}
