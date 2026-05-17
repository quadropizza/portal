import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ComboForm } from "../combo-form";

export const dynamic = "force-dynamic";

export default async function EditarComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [comboR, componentesR, produtosR] = await Promise.all([
    supabase.from("produto").select("*").eq("id", id).maybeSingle(),
    supabase.from("combo_componente")
      .select("id, produto_id, quantidade, produto:produto(nome, categoria, preco_venda)")
      .eq("combo_id", id),
    supabase.from("produto").select("id, codigo, nome, categoria, preco_venda")
      .eq("ativo", true).is("deleted_at", null).neq("id", id).neq("categoria", "combo")
      .order("categoria").order("codigo"),
  ]);
  if (!comboR.data) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <EyebrowTitle eyebrow="// COMBO" title={(comboR.data as any).nome} level={1} />
      <Card variant="creme">
        <p className="text-sm">
          Combo é composto por outros produtos. <strong>Custo = soma dos custos</strong> (pizzas
          pela ficha técnica, bebidas pelo custo cadastrado). <strong>Lucro = preço − custo total.</strong>
        </p>
      </Card>
      <ComboForm
        combo={comboR.data as any}
        componentes={(componentesR.data ?? []) as any}
        produtos={(produtosR.data ?? []) as any}
      />
    </div>
  );
}
