import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ComboFormCompleto } from "../combo-form-completo";

export const dynamic = "force-dynamic";

export default async function NovoComboPage() {
  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produto")
    .select(`id, codigo, nome, categoria, preco_venda,
             fichas:ficha_tecnica(ativa, itens:ficha_tecnica_item(quantidade, insumo:insumo(custo_medio_atual)))`)
    .eq("ativo", true).is("deleted_at", null).neq("categoria", "combo")
    .order("categoria").order("codigo");

  return (
    <div className="space-y-6 max-w-3xl">
      <EyebrowTitle eyebrow="// NOVO" title="Criar combo" level={1} />
      <Card variant="creme">
        <p className="text-sm">
          Combo é criado <strong>a partir das fichas técnicas dos produtos</strong> que ele agrupa.
          Sistema soma o custo dos componentes pra calcular margem real.
        </p>
      </Card>
      <ComboFormCompleto modo="novo" produtos={(produtos ?? []) as any} />
    </div>
  );
}
