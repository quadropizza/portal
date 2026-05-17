import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { CategoriasManager } from "./categorias-manager";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categoria_despesa")
    .select("*")
    .is("deleted_at", null)
    .order("ordem");

  return (
    <div className="space-y-6 max-w-4xl">
      <EyebrowTitle eyebrow={`// ${(data ?? []).length} CATEGORIAS`} title="Categorias de despesa" level={1} />

      <Card variant="creme">
        <p className="text-sm">
          Cada saída do extrato é classificada numa categoria, e cada categoria pertence
          a um <strong>grupo</strong> que entra na DRE. Lucas e Alessandra são grupos
          separados pra ver o impacto de cada retirada.
        </p>
      </Card>

      <CategoriasManager categorias={(data ?? []) as any} />
    </div>
  );
}
