import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const rotuloGrupo: Record<string, string> = {
  cmv: "CMV", folha: "Folha", impostos: "Impostos", aluguel: "Aluguel",
  bancarias: "Bancárias", pro_labore_lucas: "Pró-labore Lucas",
  pro_labore_alessandra: "Pró-labore Alessandra", outros: "Outros",
};

export default async function CategoriasPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categoria_despesa")
    .select("*").is("deleted_at", null).order("ordem");
  const lista = (data ?? []) as any[];
  const grupos = lista.reduce<Record<string, any[]>>((acc, c) => {
    (acc[c.grupo] ||= []).push(c); return acc;
  }, {});
  return (
    <div className="space-y-6 max-w-3xl">
      <EyebrowTitle eyebrow={`// ${lista.length} CATEGORIAS`} title="Categorias de despesa" level={1} />
      <Card variant="creme">
        <p className="text-sm">
          Cada categoria pertence a um <strong>grupo</strong>. O grupo é o que entra
          na DRE consolidada. Lucas e Alessandra são grupos separados pra calcular
          impacto da retirada de cada um (decisão §7.4 do CLAUDE.md).
        </p>
      </Card>
      {Object.entries(grupos).map(([grupo, items]) => (
        <section key={grupo}>
          <div className="eyebrow mb-2">// {rotuloGrupo[grupo]?.toUpperCase() ?? grupo.toUpperCase()}</div>
          <Card className="p-0">
            <ul>
              {items.map((c) => (
                <li key={c.id} className="px-4 py-2 border-t border-preto/5 first:border-t-0 flex justify-between text-sm">
                  <span>{c.nome}</span>
                  {!c.ativa && <span className="text-xs text-preto/40">inativa</span>}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
      <Card variant="creme">
        <p className="text-xs text-preto/60">
          Pra adicionar/editar categoria: <a href="/configuracoes" className="underline">/configurações</a>
        </p>
      </Card>
    </div>
  );
}
