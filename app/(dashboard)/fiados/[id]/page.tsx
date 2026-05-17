import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ComandaDetalhe } from "../comanda-detalhe";

export const dynamic = "force-dynamic";

export default async function FiadoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [f, items, produtos] = await Promise.all([
    supabase.from("fiado").select("*").eq("id", id).maybeSingle(),
    supabase.from("fiado_item").select("id, quantidade, valor_unitario, valor_total, produto:produto(id,nome,categoria)").eq("fiado_id", id).order("created_at"),
    supabase.from("produto").select("id, codigo, nome, categoria, preco_venda").eq("ativo", true).is("deleted_at", null).order("categoria").order("codigo"),
  ]);
  if (!f.data) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <EyebrowTitle eyebrow="// COMANDA" title={(f.data as any).nome_cliente} level={1} />
      <ComandaDetalhe
        fiado={f.data as any}
        items={(items.data ?? []) as any}
        produtos={(produtos.data ?? []) as any}
      />
    </div>
  );
}
