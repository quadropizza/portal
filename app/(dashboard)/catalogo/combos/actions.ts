"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarComponentes(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const comboId = String(formData.get("combo_id"));
  const componentes = JSON.parse(String(formData.get("componentes"))) as Array<{ produto_id: string; quantidade: number }>;

  // Apaga existentes e re-insere
  await supabase.from("combo_componente").delete().eq("combo_id", comboId);
  if (componentes.length > 0) {
    await supabase.from("combo_componente").insert(
      componentes.map((c) => ({
        combo_id: comboId,
        produto_id: c.produto_id,
        quantidade: c.quantidade,
      }))
    );
  }

  revalidatePath("/catalogo/produtos");
  revalidatePath(`/catalogo/combos/${comboId}`);
  return { ok: true };
}
