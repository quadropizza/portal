import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ContagemPizzaForm } from "./contagem-pizza-form";
import { fmtDataBR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContagemPizzaPage() {
  const supabase = await createClient();

  // Pizzas (produzidas em lote) com estoque calculado
  const { data: pizzas } = await supabase
    .from("produto")
    .select("id, codigo, nome, categoria")
    .eq("produzido_em_lote", true)
    .eq("ativo", true)
    .is("deleted_at", null)
    .order("categoria").order("codigo");

  // Estoque atual de cada pizza (soma movimentos)
  const { data: mov } = await supabase
    .from("estoque_pizza_movimento")
    .select("produto_id, quantidade")
    .is("deleted_at", null);

  const estoque = new Map<string, number>();
  for (const m of ((mov ?? []) as Array<{ produto_id: string; quantidade: number }>)) {
    estoque.set(m.produto_id, (estoque.get(m.produto_id) ?? 0) + Number(m.quantidade));
  }

  const { data: contagens } = await supabase
    .from("contagem")
    .select("id, data, tipo, observacoes, itens:contagem_item(produto_id, quantidade_contada, divergencia)")
    .eq("tipo", "pizza")
    .is("deleted_at", null)
    .order("data", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-end justify-between gap-3">
        <EyebrowTitle eyebrow="// CONTAGEM" title="Contagem de pizzas prontas" level={1} />
        <a href="/estoque/contagem-pizza/historico" className="text-sm font-[family-name:var(--font-subtitulo)] text-vermelho hover:underline">
          histórico →
        </a>
      </div>

      <Card variant="creme">
        <p className="text-sm">
          Conferir quantas pizzas tem na geladeira/freezer agora vs o que o sistema acha
          baseado nas produções e vendas. Divergência = perda, venda não lançada,
          ou produção não registrada.
        </p>
        <p className="text-xs mt-2 text-preto/60 font-[family-name:var(--font-mono)]">
          ⚠️ Pizzas paradas há mais de 10 dias = risco de perda.
        </p>
      </Card>

      <ContagemPizzaForm
        pizzas={(pizzas ?? []) as any}
        estoqueAtual={Array.from(estoque.entries()).map(([id, qtd]) => ({ id, qtd }))}
      />

      {((contagens ?? []) as any[]).length > 0 && (
        <section className="space-y-3">
          <EyebrowTitle eyebrow="// HISTÓRICO" title="Últimas contagens" level={3} />
          {((contagens ?? []) as any[]).map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-[family-name:var(--font-subtitulo)]">{fmtDataBR(c.data)}</div>
                  <div className="text-xs text-preto/60">
                    {c.itens?.length ?? 0} pizzas contadas
                    {c.observacoes && ` · ${c.observacoes}`}
                  </div>
                </div>
                {c.itens && c.itens.some((i: any) => Math.abs(i.divergencia) > 0) && (
                  <span className="text-xs bg-amarelo px-2 py-1 rounded font-[family-name:var(--font-mono)]">
                    {c.itens.filter((i: any) => Math.abs(i.divergencia) > 0).length} divergência(s)
                  </span>
                )}
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
