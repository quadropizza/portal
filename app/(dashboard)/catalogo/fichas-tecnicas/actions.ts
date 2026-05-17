"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarFicha(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const produtoId = String(formData.get("produto_id"));
  const itens = JSON.parse(String(formData.get("itens"))) as Array<{ insumo_id: string; quantidade: string; unidade: string }>;

  // Marca ficha atual como inativa (mantém histórico)
  await supabase.from("ficha_tecnica").update({ ativa: false }).eq("produto_id", produtoId).eq("ativa", true);

  // Próxima versão
  const { data: ultima } = await supabase.from("ficha_tecnica")
    .select("versao").eq("produto_id", produtoId)
    .order("versao", { ascending: false }).limit(1).maybeSingle();
  const proxVersao = ((ultima as { versao?: number } | null)?.versao ?? 0) + 1;

  const { data: ficha } = await supabase.from("ficha_tecnica")
    .insert({ produto_id: produtoId, versao: proxVersao, ativa: true })
    .select("id").single();
  const fichaId = (ficha as { id: string }).id;

  if (itens.length > 0) {
    await supabase.from("ficha_tecnica_item").insert(
      itens.map((it) => ({
        ficha_tecnica_id: fichaId,
        insumo_id: it.insumo_id,
        quantidade: Number(it.quantidade),
        unidade: it.unidade,
      }))
    );
  }

  revalidatePath("/catalogo/fichas-tecnicas");
  return { ok: true };
}
