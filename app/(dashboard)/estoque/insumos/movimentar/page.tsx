import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { InsumosMovForm } from "./insumos-mov-form";

export const dynamic = "force-dynamic";

export default async function MovimentarInsumosPage() {
  const supabase = await createClient();
  const [insumosR, movR] = await Promise.all([
    supabase.from("insumo").select("id, nome, unidade_padrao, custo_medio_atual, custo_origem")
      .eq("ativo", true).is("deleted_at", null).order("nome"),
    supabase.from("estoque_insumo_movimento").select("insumo_id, quantidade").is("deleted_at", null),
  ]);

  const insumos = (insumosR.data ?? []) as any[];
  const saldo = new Map<string, number>();
  for (const m of ((movR.data ?? []) as any[])) {
    saldo.set(m.insumo_id, (saldo.get(m.insumo_id) ?? 0) + Number(m.quantidade));
  }
  const enriched = insumos.map((i) => ({ ...i, saldo: saldo.get(i.id) ?? 0 }));

  return (
    <div className="space-y-6 max-w-4xl">
      <EyebrowTitle eyebrow="// ESTOQUE" title="Lançar movimento de insumos" level={1} />
      <Card variant="creme">
        <p className="text-sm">
          Lançar item por item — igual ao de bebidas. Toda <strong>segunda-feira</strong>
          conta o que tem e lança como <strong>contagem inicial/ajuste</strong>. Quando chega
          NF, lança como <strong>entrada</strong>. Se sobrou pizza demais (estragou insumo),
          lança como <strong>perda</strong>.
        </p>
      </Card>
      <InsumosMovForm insumos={enriched} />
    </div>
  );
}
