import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtPct, cn } from "@/lib/utils";
import { Plus, CheckCircle2, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const rotuloCat: Record<string, string> = {
  pizza_grande: "Pizza grande", pizza_mini: "Pizza mini",
  combo: "Combo", bebida: "Bebida", sobremesa: "Sobremesa", outro: "Outro",
};

export default async function CatalogoPage() {
  const supabase = await createClient();
  const hoje = new Date();
  const mesAntAno = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
  const mesAntMes = hoje.getMonth() === 0 ? 12 : hoje.getMonth();

  const [prodR, dreAntR, vendasMesAntR] = await Promise.all([
    supabase.from("produto")
      .select(`id, codigo, nome, categoria, preco_venda, produzido_em_lote, ativo,
               fichas:ficha_tecnica(id, ativa, itens:ficha_tecnica_item(quantidade, unidade,
                 insumo:insumo(nome, custo_medio_atual, custo_origem)))`)
      .is("deleted_at", null).order("categoria").order("codigo"),
    // Despesas fixas do mês anterior (folha + aluguel + bancárias + impostos + outros)
    supabase.from("dre_mensal").select("*").eq("ano", mesAntAno).eq("mes", mesAntMes).maybeSingle(),
    // Total de unidades vendidas no mês anterior pra ratear
    supabase.from("vendas_por_produto").select("qtd_total").eq("ano", mesAntAno).eq("mes", mesAntMes),
  ]);

  const produtos = (prodR.data ?? []) as any[];
  const dreAnt: any = dreAntR.data ?? null;
  const vendasAnt = (vendasMesAntR.data ?? []) as Array<{ qtd_total: number }>;

  // Despesas fixas do mês anterior (sem CMV, sem pró-labore — só fixas operacionais)
  const fixasMesAnt = dreAnt
    ? Math.abs(Number(dreAnt.folha ?? 0)) + Math.abs(Number(dreAnt.aluguel ?? 0))
      + Math.abs(Number(dreAnt.bancarias ?? 0)) + Math.abs(Number(dreAnt.impostos ?? 0))
      + Math.abs(Number(dreAnt.outros ?? 0))
    : 0;
  const unidadesVendidasMesAnt = vendasAnt.reduce((s, v) => s + Number(v.qtd_total), 0);
  const rateioPorUnidade = unidadesVendidasMesAnt > 0 ? fixasMesAnt / unidadesVendidasMesAnt : 0;

  function calcular(p: any) {
    const ficha = p.fichas?.find((f: any) => f.ativa);
    let custo = 0; let seed = false;
    if (ficha?.itens) {
      for (const it of ficha.itens) {
        const c = Number(it.insumo?.custo_medio_atual ?? 0);
        custo += c * Number(it.quantidade);
        if (it.insumo?.custo_origem === "seed") seed = true;
      }
    }
    const preco = Number(p.preco_venda ?? 0);
    const lucroBruto = preco - custo;
    const margemBruta = preco > 0 ? lucroBruto / preco : 0;
    // Lucro líquido por unidade = lucro bruto − rateio fixo
    const lucroLiq = lucroBruto - rateioPorUnidade;
    const margemLiq = preco > 0 ? lucroLiq / preco : 0;
    return { ficha, custo, lucroBruto, margemBruta, lucroLiq, margemLiq, algumSeed: seed, semFicha: !ficha };
  }

  const grupos = produtos.reduce<Record<string, any[]>>((acc, p) => {
    (acc[p.categoria] ||= []).push(p); return acc;
  }, {});
  const ordem = ["pizza_grande", "pizza_mini", "combo", "bebida", "sobremesa", "outro"];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <EyebrowTitle eyebrow={`// ${produtos.length} PRODUTOS`} title="Catálogo" level={1} />
        <div className="flex gap-2">
          <Link href="/catalogo/produtos/novo?categoria=combo">
            <Button variant="creme"><Plus size={14} /> Combo</Button>
          </Link>
          <Link href="/catalogo/produtos/novo">
            <Button variant="vermelho"><Plus size={14} /> Produto</Button>
          </Link>
        </div>
      </div>

      <Card variant="creme">
        <p className="text-sm">
          Cada produto mostra ficha técnica + custo + lucro bruto + lucro líquido
          (já descontando rateio de despesas fixas do mês anterior por unidade).
        </p>
        {dreAnt && (
          <p className="text-xs mt-2 text-preto/60 font-[family-name:var(--font-mono)]">
            💡 Despesas fixas mês anterior: {fmtBR(fixasMesAnt)} · vendidas {unidadesVendidasMesAnt} unidades · rateio {fmtBR(rateioPorUnidade)}/un
          </p>
        )}
        {!dreAnt && (
          <p className="text-xs mt-2 text-amarelo-escuro font-[family-name:var(--font-mono)]">
            ⚠️ Sem DRE do mês anterior — lucro líquido = lucro bruto (sem rateio).
          </p>
        )}
      </Card>

      {ordem.map((cat) => {
        const items = grupos[cat];
        if (!items?.length) return null;
        return (
          <section key={cat}>
            <div className="eyebrow mb-2 flex items-center justify-between">
              <span>// {rotuloCat[cat]?.toUpperCase() ?? cat.toUpperCase()} · {items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((p: any) => {
                const { ficha, custo, lucroBruto, margemBruta, lucroLiq, margemLiq, algumSeed, semFicha } = calcular(p);
                return (
                  <Card key={p.id} className={!p.ativo ? "opacity-50" : ""}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {semFicha
                            ? <AlertTriangle size={14} className="text-vermelho" />
                            : algumSeed
                              ? <AlertTriangle size={14} className="text-amarelo-escuro" />
                              : <CheckCircle2 size={14} className="text-verde" />}
                          <span className="font-[family-name:var(--font-mono)] text-xs text-preto/50">{p.codigo}</span>
                          <span className="font-[family-name:var(--font-subtitulo)]">{p.nome}</span>
                          {!p.ativo && <span className="text-[10px] text-preto/40">inativo</span>}
                        </div>
                        {ficha?.itens && ficha.itens.length > 0 && (
                          <ul className="mt-1.5 text-[11px] text-preto/60 flex flex-wrap gap-x-3 gap-y-0.5 font-[family-name:var(--font-mono)]">
                            {ficha.itens.map((it: any, i: number) => (
                              <li key={i}>• {it.insumo?.nome ?? "?"} {it.quantidade}{it.unidade}</li>
                            ))}
                          </ul>
                        )}
                        {semFicha && p.produzido_em_lote && (
                          <div className="mt-1 text-xs text-vermelho">Sem ficha técnica</div>
                        )}
                      </div>

                      {/* Lucratividade */}
                      <div className="flex gap-1.5 shrink-0 items-stretch flex-wrap">
                        <Mini r="Preço" v={fmtBR(p.preco_venda ?? 0)} />
                        {!semFicha && (
                          <>
                            <Mini r="Custo" v={fmtBR(custo)} cor="vermelho" />
                            <Mini r="L bruto" v={fmtBR(lucroBruto)} pct={fmtPct(margemBruta)} cor={margemBruta >= 0.65 ? "verde" : margemBruta >= 0.40 ? "amarelo" : "vermelho"} />
                            <Mini r="L líq" v={fmtBR(lucroLiq)} pct={fmtPct(margemLiq)} cor={lucroLiq > 0 ? "verde" : "vermelho"} />
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <Link href={`/catalogo/fichas-tecnicas/${p.id}`} className="text-xs font-[family-name:var(--font-subtitulo)] text-vermelho hover:underline whitespace-nowrap">
                          {ficha ? "editar ficha" : "criar ficha"} →
                        </Link>
                        <Link href={`/catalogo/produtos/${p.id}`} className="text-xs font-[family-name:var(--font-subtitulo)] text-preto/60 hover:text-vermelho whitespace-nowrap">
                          editar produto →
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

function Mini({ r, v, pct, cor }: { r: string; v: string; pct?: string; cor?: "verde" | "vermelho" | "amarelo" }) {
  const corCls = cor === "verde" ? "border-verde text-verde"
                : cor === "vermelho" ? "border-vermelho text-vermelho"
                : cor === "amarelo" ? "border-amarelo-escuro text-amarelo-escuro"
                : "border-preto/30";
  return (
    <div className={cn("px-2 py-1.5 border-2 rounded-lg bg-creme-claro text-center min-w-[64px]", corCls)}>
      <div className="text-[9px] font-[family-name:var(--font-mono)] uppercase text-preto/60">{r}</div>
      <div className="text-xs font-[family-name:var(--font-subtitulo)]">{v}</div>
      {pct && <div className="text-[9px] font-[family-name:var(--font-mono)] opacity-60">{pct}</div>}
    </div>
  );
}
