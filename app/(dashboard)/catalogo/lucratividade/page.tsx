import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtPct, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LucratividadePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto")
    .select(`id, codigo, nome, categoria, preco_venda,
             fichas:ficha_tecnica(id, ativa,
               itens:ficha_tecnica_item(quantidade, unidade, insumo:insumo(nome, custo_medio_atual, custo_origem)))`)
    .eq("ativo", true)
    .is("deleted_at", null)
    .order("categoria").order("codigo");

  const produtos = (data ?? []) as any[];

  // Calcula custo + margem por produto
  const linhas = produtos.map((p) => {
    const ficha = p.fichas?.find((f: any) => f.ativa);
    let custo = 0;
    let algumSeed = false;
    let semFicha = !ficha;
    if (ficha?.itens) {
      for (const it of ficha.itens) {
        const c = Number(it.insumo?.custo_medio_atual ?? 0);
        custo += c * Number(it.quantidade);
        if (it.insumo?.custo_origem === "seed") algumSeed = true;
      }
    }
    const preco = Number(p.preco_venda ?? 0);
    const lucroUnit = preco - custo;
    const margem = preco > 0 ? lucroUnit / preco : 0;
    const markup = custo > 0 ? lucroUnit / custo : 0;
    return { ...p, ficha, custo, lucroUnit, margem, markup, algumSeed, semFicha };
  });

  // Agrupa por categoria
  const grupos = linhas.reduce<Record<string, any[]>>((acc, l) => {
    (acc[l.categoria] ||= []).push(l);
    return acc;
  }, {});
  const ordem = ["pizza_grande", "pizza_mini", "combo", "bebida", "outro"];
  const rotuloCat: Record<string, string> = {
    pizza_grande: "Pizzas grandes",
    pizza_mini: "Mini pizzas",
    combo: "Combos",
    bebida: "Bebidas",
    outro: "Outros",
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <EyebrowTitle eyebrow="// CATÁLOGO" title="Lucratividade por produto" level={1} />

      <Card variant="creme">
        <p className="text-sm">
          Lucro unitário e margem de cada produto, calculados a partir da ficha técnica + custo médio
          atual dos insumos. <strong>Margem saudável de pizza: ≥ 65%</strong>. Bebida: ≥ 50%.
        </p>
        <p className="text-xs mt-2 text-preto/60 font-[family-name:var(--font-mono)]">
          🟡 = algum insumo ainda no custo seed (será recalculado quando NF-e chegar)
        </p>
      </Card>

      {ordem.map((cat) => {
        const items = grupos[cat];
        if (!items?.length) return null;
        return (
          <section key={cat}>
            <div className="eyebrow mb-2">// {rotuloCat[cat]?.toUpperCase() ?? cat.toUpperCase()}</div>
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
                  <tr>
                    <th className="px-3 py-2 text-left w-16">Cód</th>
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-right w-20">Preço</th>
                    <th className="px-3 py-2 text-right w-24">Custo</th>
                    <th className="px-3 py-2 text-right w-24">Lucro/un</th>
                    <th className="px-3 py-2 text-right w-20">Margem</th>
                    <th className="px-3 py-2 text-right w-20">Markup</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p: any) => (
                    <tr key={p.id} className="border-t border-preto/5 hover:bg-amarelo/10">
                      <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-xs">{p.codigo}</td>
                      <td className="px-3 py-2">
                        <div className="font-[family-name:var(--font-subtitulo)] flex items-center gap-2">
                          {p.nome}
                          {p.algumSeed && <span title="Custo seed">🟡</span>}
                          {p.semFicha && <span title="Sem ficha" className="text-vermelho"><AlertTriangle size={12} className="inline" /></span>}
                        </div>
                        {p.ficha?.itens && p.ficha.itens.length > 0 && (
                          <ul className="text-[10px] text-preto/50 font-[family-name:var(--font-mono)] mt-0.5">
                            {p.ficha.itens.slice(0, 3).map((it: any, i: number) => (
                              <li key={i}>• {it.insumo?.nome} {it.quantidade}{it.unidade}</li>
                            ))}
                            {p.ficha.itens.length > 3 && <li className="opacity-50">+ {p.ficha.itens.length - 3} ingrediente(s)</li>}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{fmtBR(p.preco_venda ?? 0)}</td>
                      <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">
                        {p.semFicha ? <span className="text-vermelho text-xs">—</span> : fmtBR(p.custo)}
                      </td>
                      <td className={cn("px-3 py-2 text-right font-[family-name:var(--font-subtitulo)]", p.lucroUnit > 0 ? "text-verde" : p.lucroUnit < 0 ? "text-vermelho" : "")}>
                        {p.semFicha ? "—" : fmtBR(p.lucroUnit)}
                      </td>
                      <td className={cn("px-3 py-2 text-right font-[family-name:var(--font-mono)]",
                        p.margem >= 0.65 ? "text-verde" : p.margem >= 0.40 ? "text-amarelo-escuro" : "text-vermelho")}>
                        {p.semFicha ? "—" : fmtPct(p.margem)}
                      </td>
                      <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)] text-xs text-preto/60">
                        {p.semFicha ? "—" : `${(p.markup * 100).toFixed(0)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        );
      })}

      <Card variant="creme">
        <div className="text-xs space-y-1 font-[family-name:var(--font-mono)]">
          <div>📚 <strong>Margem</strong> = (preço − custo) / preço · quanto fica de cada R$ vendido</div>
          <div>📚 <strong>Markup</strong> = (preço − custo) / custo · quanto cobra em cima do custo</div>
          <div>📚 Pizzaria saudável: margem 65-75%</div>
        </div>
      </Card>
    </div>
  );
}
