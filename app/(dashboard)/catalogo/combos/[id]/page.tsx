import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ComboFormCompleto } from "../combo-form-completo";

export const dynamic = "force-dynamic";

export default async function EditarComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [comboR, componentesR, produtosR] = await Promise.all([
    supabase.from("produto").select("*").eq("id", id).maybeSingle(),
    supabase.from("combo_componente").select("produto_id, quantidade").eq("combo_id", id),
    supabase.from("produto")
      .select(`id, codigo, nome, categoria, preco_venda,
               fichas:ficha_tecnica(ativa, itens:ficha_tecnica_item(quantidade, insumo:insumo(custo_medio_atual)))`)
      .eq("ativo", true).is("deleted_at", null).neq("id", id).neq("categoria", "combo")
      .order("categoria").order("codigo"),
  ]);
  if (!comboR.data) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <EyebrowTitle eyebrow="// EDITAR COMBO" title={(comboR.data as any).nome} level={1} />
      <Card variant="creme">
        <p className="text-sm">
          Combo monta-se a partir das <strong>fichas técnicas</strong> dos produtos componentes.
          Custo total = soma das fichas. Lucro = preço − custo.
        </p>
      </Card>
      <ComboFormCompleto
        modo="editar"
        combo={comboR.data as any}
        produtos={(produtosR.data ?? []) as any}
        componentesIniciais={(componentesR.data ?? []) as any}
      />
    </div>
  );
}
