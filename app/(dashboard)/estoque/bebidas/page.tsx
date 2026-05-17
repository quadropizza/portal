import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { BebidasForm } from "./bebidas-form";

export const dynamic = "force-dynamic";

export default async function BebidasPage() {
  const supabase = await createClient();
  const { data: bebidas } = await supabase
    .from("bebida_saldo")
    .select("*")
    .order("nome");

  return (
    <div className="space-y-6 max-w-4xl">
      <EyebrowTitle eyebrow="// ESTOQUE" title="Bebidas" level={1} />
      <Card variant="creme">
        <p className="text-sm">
          Controle de bebidas em estoque (Coca, Sprite, Fanta, Guaraná, água, Del Valle, Kapo).
          Cada venda ou fiado baixa do saldo. Contagem semanal calibra.
        </p>
        <p className="text-xs mt-2 text-preto/60 font-[family-name:var(--font-mono)]">
          Começa a ser preenchido a partir do dia 19 (segunda-feira).
        </p>
      </Card>
      <BebidasForm bebidas={(bebidas ?? []) as any} />
    </div>
  );
}
