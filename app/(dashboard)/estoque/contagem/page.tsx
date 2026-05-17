import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ContagemInsumoForm } from "./contagem-insumo-form";
import { fmtDataBR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContagemPage() {
  const supabase = await createClient();

  const [insumosR, contagensR] = await Promise.all([
    supabase.from("insumo").select("id, nome, unidade_padrao, custo_medio_atual")
      .eq("ativo", true).is("deleted_at", null).order("nome"),
    supabase.from("contagem")
      .select(`id, data, tipo, observacoes,
               itens:contagem_item(insumo_id, quantidade_contada, quantidade_esperada, divergencia, valor_divergencia,
                                    insumo:insumo(nome, unidade_padrao))`)
      .eq("tipo", "insumo")
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .limit(10),
  ]);

  // Saldo atual de cada insumo (soma de movimentos)
  const { data: mov } = await supabase
    .from("estoque_insumo_movimento")
    .select("insumo_id, quantidade")
    .is("deleted_at", null);
  const saldo = new Map<string, number>();
  for (const m of ((mov ?? []) as Array<{ insumo_id: string; quantidade: number }>)) {
    saldo.set(m.insumo_id, (saldo.get(m.insumo_id) ?? 0) + Number(m.quantidade));
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <EyebrowTitle eyebrow="// CONTAGEM SEMANAL" title="Contagem de insumos" level={1} />

      <Card variant="creme">
        <p className="text-sm">
          Toda <strong>segunda-feira</strong>, contar o que tem de cada insumo na cozinha
          (kg, litros, unidades). Sistema mostra o esperado ao lado pra você comparar.
          Divergência vira ajuste automático no estoque.
        </p>
        <p className="text-xs mt-2 text-preto/60 font-[family-name:var(--font-mono)]">
          ⚠️ Divergência grande pode ser perda, contagem errada anterior, ou movimento não lançado.
        </p>
      </Card>

      <ContagemInsumoForm
        insumos={(insumosR.data ?? []) as any}
        saldoAtual={Array.from(saldo.entries()).map(([id, qtd]) => ({ id, qtd }))}
      />

      {((contagensR.data ?? []) as any[]).length > 0 && (
        <section className="space-y-3">
          <EyebrowTitle eyebrow="// HISTÓRICO" title="Últimas contagens" level={3} />
          {((contagensR.data ?? []) as any[]).map((c) => {
            const itens = c.itens ?? [];
            const divs = itens.filter((i: any) => Math.abs(i.divergencia) > 0.001);
            const valorDivTotal = itens.reduce((s: number, i: any) => s + Math.abs(Number(i.valor_divergencia ?? 0)), 0);
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-[family-name:var(--font-subtitulo)]">{fmtDataBR(c.data)}</div>
                    <div className="text-xs text-preto/60 mt-1">
                      {itens.length} insumos · {divs.length} com divergência · perda R$ {valorDivTotal.toFixed(2)}
                    </div>
                    {c.observacoes && <div className="text-xs italic mt-1">{c.observacoes}</div>}
                  </div>
                </div>
                {divs.length > 0 && (
                  <table className="w-full text-xs">
                    <thead className="text-preto/60 uppercase font-[family-name:var(--font-mono)]">
                      <tr className="border-b border-preto/10">
                        <th className="text-left py-1">Insumo</th>
                        <th className="text-right py-1 w-20">Esperado</th>
                        <th className="text-right py-1 w-20">Contado</th>
                        <th className="text-right py-1 w-24">Diferença</th>
                      </tr>
                    </thead>
                    <tbody>
                      {divs.map((i: any) => {
                        const div = Number(i.divergencia);
                        return (
                          <tr key={i.insumo_id} className="border-b border-preto/5">
                            <td className="py-1">{i.insumo?.nome ?? "—"}</td>
                            <td className="text-right py-1 font-[family-name:var(--font-mono)]">{Number(i.quantidade_esperada ?? 0).toFixed(3)} {i.insumo?.unidade_padrao}</td>
                            <td className="text-right py-1 font-[family-name:var(--font-mono)]">{Number(i.quantidade_contada).toFixed(3)} {i.insumo?.unidade_padrao}</td>
                            <td className={`text-right py-1 font-[family-name:var(--font-mono)] font-bold ${div > 0 ? "text-verde" : "text-vermelho"}`}>
                              {div > 0 ? "+" : ""}{div.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
