"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function abrirComanda(formData: FormData): Promise<{ ok: boolean; id?: string; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "não auth" };
  const { data: u } = await supabase.from("usuario").select("empresa_id").eq("id", user.id).maybeSingle();
  const empresaId = (u as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { ok: false, erro: "sem empresa" };

  const nome = String(formData.get("nome"));
  const telefone = (formData.get("telefone") as string) || null;
  const items = JSON.parse(String(formData.get("items"))) as Array<{ produto_id: string; quantidade: number }>;

  const { data: fiado } = await supabase.from("fiado")
    .insert({ empresa_id: empresaId, nome_cliente: nome, telefone, status: "aberto", created_by: user.id })
    .select("id").single();
  const fiadoId = (fiado as { id: string }).id;

  // Inserir items (precisa buscar preço atual)
  const prodIds = items.map((i) => i.produto_id);
  const { data: produtos } = await supabase.from("produto").select("id, preco_venda").in("id", prodIds);
  const precoMap = new Map(((produtos ?? []) as Array<{ id: string; preco_venda: number }>).map((p) => [p.id, Number(p.preco_venda)]));

  const itemRows = items.map((it) => ({
    fiado_id: fiadoId,
    produto_id: it.produto_id,
    quantidade: it.quantidade,
    valor_unitario: precoMap.get(it.produto_id) ?? 0,
    valor_total: (precoMap.get(it.produto_id) ?? 0) * it.quantidade,
  }));
  await supabase.from("fiado_item").insert(itemRows);

  revalidatePath("/fiados");
  return { ok: true, id: fiadoId };
}

export async function adicionarItem(formData: FormData): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const fiadoId = String(formData.get("fiado_id"));
  const produtoId = String(formData.get("produto_id"));
  const quantidade = Number(formData.get("quantidade"));
  const dataConsumo = (formData.get("data_consumo") as string) || null;

  const { data: produto } = await supabase.from("produto").select("preco_venda").eq("id", produtoId).maybeSingle();
  const preco = Number((produto as { preco_venda?: number } | null)?.preco_venda ?? 0);

  const payload: Record<string, unknown> = {
    fiado_id: fiadoId, produto_id: produtoId, quantidade,
    valor_unitario: preco, valor_total: preco * quantidade,
  };
  if (dataConsumo) payload.created_at = new Date(dataConsumo).toISOString();

  await supabase.from("fiado_item").insert(payload);
  revalidatePath(`/fiados/${fiadoId}`);
  return { ok: true };
}

export async function fecharComanda(formData: FormData): Promise<{ ok: boolean }> {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("fiado")
    .update({ status: "fechado", data_fechamento: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/fiados");
  revalidatePath(`/fiados/${id}`);
  return { ok: true };
}

export async function marcarPaga(formData: FormData): Promise<{ ok: boolean }> {
  const id = String(formData.get("id"));
  const forma = (formData.get("forma") as string) || "pix";
  const supabase = await createClient();
  await supabase.from("fiado")
    .update({ status: "pago", data_pagamento: new Date().toISOString(), forma_pagamento: forma })
    .eq("id", id);
  revalidatePath("/fiados");
  revalidatePath(`/fiados/${id}`);
  return { ok: true };
}

export async function deletarFiado(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("fiado").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/fiados");
}
