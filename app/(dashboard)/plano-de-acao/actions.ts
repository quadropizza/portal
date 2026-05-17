"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Gera o plano do mês chamando a função SQL gerar_plano_mensal.
 * Idempotente — re-chamar não duplica itens (decisão §7.17).
 */
export async function gerarPlano(formData: FormData) {
  const ano = Number(formData.get("ano"));
  const mes = Number(formData.get("mes"));
  const supabase = await createClient();

  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) throw new Error("não autenticado");

  // pega empresa_id do usuário
  const { data: u } = await supabase
    .from("usuario")
    .select("empresa_id")
    .eq("id", usuario.user.id)
    .maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) throw new Error("usuário sem empresa vinculada");

  await supabase.rpc("gerar_plano_mensal", {
    p_empresa: empresaId,
    p_ano: ano,
    p_mes: mes,
  });

  revalidatePath("/plano-de-acao");
  revalidatePath("/visao-geral");
}

/** Marca/desmarca um item do plano como concluído. Tudo é editável (§7.15). */
export async function toggleStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const novoStatus = String(formData.get("novo_status")) as "pendente" | "em_andamento" | "concluido" | "arquivado";

  const supabase = await createClient();
  await supabase
    .from("plano_acao_item")
    .update({
      status: novoStatus,
      concluido_em: novoStatus === "concluido" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidatePath("/plano-de-acao");
  revalidatePath("/visao-geral");
}

/** Soft delete — decisão §7.15. */
export async function deletarItem(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase
    .from("plano_acao_item")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/plano-de-acao");
  revalidatePath("/visao-geral");
}
