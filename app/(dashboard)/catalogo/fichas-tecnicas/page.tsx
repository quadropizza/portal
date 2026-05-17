import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtPct, cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FichasPage() {
  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produto")
    .select(`id, codigo, nome, categoria, preco_venda, produzido_em_lote,
             fichas:ficha_tecnica(id, versao, ativa,
               itens:ficha_tecnica_item(quantidade, unidade,
                 insumo:insumo(nome, custo_medio_atual, custo_origem)))`)
    .eq("ativo", true)
    .is("deleted_at", null)
    .order("categoria").order("codigo");

  const lista = (produtos ?? []) as any[];

  function calcular(p: any) {
    const ficha = p.fichas?.find((f: any) => f.ativa);
    if (!ficha?.itens) return { ficha: null, custo: 0, algumSeed: false, lucro: 0, margem: 0 };
    let custo = 0; let seed = false;
    for (const it of ficha.itens) {
      const c = Number(it.insumo?.custo_medio_atual ?? 0);
      custo += c * Number(it.quantidade);
      if (it.insumo?.custo_origem === "seed") seed = true;
    }
    const preco = Number(p.preco_venda ?? 0);
    const lucro = preco - custo;
    const margem = preco > 0 ? lucro / preco : 0;
    return { ficha, custo, algumSeed: seed, lucro, margem };
  }

  // Agrupar por categoria
  const grupos = lista.reduce<Record<string, any[]>>((acc, p) => {
    (acc[p.categoria] ||= []).push(p);
    return acc;
  }, {});
  const ordem = ["pizza_grande", "pizza_mini", "combo", "bebida", "outro"];
  const rotuloCat: Record<string, string> = {
    pizza_grande: "Pizzas grandes", pizza_mini: "Mini pizzas",
    combo: "Combos", bebida: "Bebidas", outro: "Outros",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <EyebrowTitle eyebrow={`// ${lista.length} PRODUTOS`} title="Fichas técnicas + lucratividade" level={1} />

      <Card variant="creme">
        <p className="text-sm">
          Cada produto mostra ingredientes (ficha técnica), <strong>custo unitário</strong>,
          <strong> lucro/unidade</strong> e <strong>margem %</strong>. Custo é recalculado em tempo
          real a partir do custo médio dos insumos (atualiza a cada NF-e). Meta: margem ≥ 65% em pizza.
        </p>
      </Card>

      {ordem.map((cat) => {
        const items = grupos[cat];
        if (!items?.length) return null;
        return (
          <section key={cat}>
            <div className="eyebrow mb-2">// {rotuloCat[cat]?.toUpperCase() ?? cat.toUpperCase()}</div>
            <div className="space-y-3">
              {items.map((p: any) => {
                const { ficha, custo, algumSeed, lucro, margem } = calcular(p);
                return (
                  <Card key={p.id}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {ficha
                            ? algumSeed
                              ? <AlertTriangle size={14} className="text-amarelo-escuro" />
                              : <CheckCircle2 size={14} className="text-verde" />
                            : <AlertTriangle size={14} className="text-vermelho" />}
                          <span className="font-[family-name:var(--font-mono)] text-xs text-preto/50">{p.codigo}</span>
                          <span className="font-[family-name:var(--font-subtitulo)] text-lg">{p.nome}</span>
                        </div>
                        {ficha?.itens && ficha.itens.length > 0 ? (
                          <ul className="mt-2 text-xs text-preto/70 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5">
                            {ficha.itens.map((it: any, i: number) => (
                              <li key={i} className="font-[family-name:var(--font-mono)]">
                                • {it.insumo?.nome ?? "?"}: {it.quantidade}{it.unidade}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="mt-2 text-xs text-vermelho">Sem ficha técnica cadastrada</div>
                        )}
                      </div>

                      {/* Bloco de lucratividade */}
                      <div className="flex gap-2 shrink-0 items-stretch">
                        <Stat rotulo="Preço" valor={fmtBR(p.preco_venda ?? 0)} />
                        {ficha ? (
                          <>
                            <Stat rotulo="Custo" valor={fmtBR(custo)} cor="vermelho" />
                            <Stat rotulo="Lucro" valor={fmtBR(lucro)} cor={lucro > 0 ? "verde" : "vermelho"} />
                            <Stat
                              rotulo="Margem"
                              valor={fmtPct(margem)}
                              cor={margem >= 0.65 ? "verde" : margem >= 0.4 ? "amarelo" : "vermelho"}
                            />
                          </>
                        ) : (
                          <Stat rotulo="Ficha" valor="—" cor="vermelho" />
                        )}
                        <Link href={`/catalogo/fichas-tecnicas/${p.id}`}
                          className="self-center text-xs font-[family-name:var(--font-subtitulo)] text-vermelho hover:underline ml-2">
                          {ficha ? "editar" : "criar"} →
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Stat({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: "verde" | "vermelho" | "amarelo" }) {
  const corCls = cor === "verde" ? "text-verde border-verde"
                : cor === "vermelho" ? "text-vermelho border-vermelho"
                : cor === "amarelo" ? "text-amarelo-escuro border-amarelo-escuro"
                : "border-preto/30";
  return (
    <div className={cn("px-3 py-2 border-2 rounded-lg bg-creme-claro text-center min-w-[68px]", corCls)}>
      <div className="text-[9px] font-[family-name:var(--font-mono)] uppercase text-preto/60">{rotulo}</div>
      <div className="text-sm font-[family-name:var(--font-subtitulo)]">{valor}</div>
    </div>
  );
}
