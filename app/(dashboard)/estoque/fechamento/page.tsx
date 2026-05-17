import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FechamentoEstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const sp = await searchParams;
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];
  const de = sp.de ?? inicioMes;
  const ate = sp.ate ?? hoje.toISOString().split("T")[0];

  const supabase = await createClient();

  const [insumosR, pizzasR, bebidasR, movInsumosR, movPizzasR, movBebidasR] = await Promise.all([
    supabase.from("insumo").select("id, nome, unidade_padrao, custo_medio_atual").eq("ativo", true).is("deleted_at", null).order("nome"),
    supabase.from("produto").select("id, codigo, nome").eq("produzido_em_lote", true).eq("ativo", true).is("deleted_at", null).order("nome"),
    supabase.from("produto").select("id, codigo, nome").eq("categoria", "bebida").eq("ativo", true).is("deleted_at", null).order("nome"),
    supabase.from("estoque_insumo_movimento").select("insumo_id, tipo, quantidade, custo_unitario, data_hora")
      .is("deleted_at", null).gte("data_hora", de).lte("data_hora", ate + "T23:59:59"),
    supabase.from("estoque_pizza_movimento").select("produto_id, tipo, quantidade, data_hora")
      .is("deleted_at", null).gte("data_hora", de).lte("data_hora", ate + "T23:59:59"),
    supabase.from("estoque_bebida_movimento").select("produto_id, tipo, quantidade, custo_unitario, data_hora")
      .is("deleted_at", null).gte("data_hora", de).lte("data_hora", ate + "T23:59:59"),
  ]);

  const insumos = (insumosR.data ?? []) as any[];
  const pizzas = (pizzasR.data ?? []) as any[];
  const bebidas = (bebidasR.data ?? []) as any[];
  const movInsumos = (movInsumosR.data ?? []) as any[];
  const movPizzas = (movPizzasR.data ?? []) as any[];
  const movBebidas = (movBebidasR.data ?? []) as any[];

  function aggregateMov<T extends { quantidade: number; tipo: string }>(movs: T[]) {
    let entradas = 0, saidas = 0, perdas = 0, ajustes = 0;
    for (const m of movs) {
      const q = Number(m.quantidade);
      if (q > 0) {
        if (m.tipo === "entrada_nf" || m.tipo === "entrada" || m.tipo === "producao" || m.tipo === "contagem_inicial") entradas += q;
        else if (m.tipo === "ajuste_contagem") ajustes += q;
      } else if (q < 0) {
        if (m.tipo === "perda") perdas += -q;
        else if (m.tipo === "ajuste_contagem") ajustes += q;
        else saidas += -q;
      }
    }
    return { entradas, saidas, perdas, ajustes };
  }

  const linhasInsumos = insumos.map((i) => {
    const movs = movInsumos.filter((m) => m.insumo_id === i.id);
    const a = aggregateMov(movs);
    const saldo = a.entradas - a.saidas - a.perdas + a.ajustes;
    const valor = saldo * Number(i.custo_medio_atual ?? 0);
    return { ...i, ...a, saldo, valor };
  }).filter((l) => l.entradas > 0 || l.saidas > 0 || l.perdas > 0 || l.ajustes !== 0);

  const linhasPizzas = pizzas.map((p) => {
    const movs = movPizzas.filter((m) => m.produto_id === p.id);
    const a = aggregateMov(movs);
    const saldo = a.entradas - a.saidas - a.perdas + a.ajustes;
    return { ...p, ...a, saldo };
  }).filter((l) => l.entradas > 0 || l.saidas > 0 || l.perdas > 0 || l.ajustes !== 0);

  const linhasBebidas = bebidas.map((b) => {
    const movs = movBebidas.filter((m) => m.produto_id === b.id);
    const a = aggregateMov(movs);
    const saldo = a.entradas - a.saidas - a.perdas + a.ajustes;
    return { ...b, ...a, saldo };
  }).filter((l) => l.entradas > 0 || l.saidas > 0 || l.perdas > 0 || l.ajustes !== 0);

  const valorInsumos = linhasInsumos.reduce((s, l) => s + l.valor, 0);
  const perdasInsumos = linhasInsumos.reduce((s, l) => s + l.perdas, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <EyebrowTitle eyebrow="// ESTOQUE" title="Fechamento" level={1} />
        <form className="flex items-end gap-2 text-sm">
          <div>
            <label className="eyebrow block mb-1">De</label>
            <input type="date" name="de" defaultValue={de} className="px-2 py-1.5 border-2 border-preto rounded bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Até</label>
            <input type="date" name="ate" defaultValue={ate} className="px-2 py-1.5 border-2 border-preto rounded bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <button className="btn-bruto btn-vermelho">filtrar</button>
        </form>
      </div>

      <Card variant="creme">
        <p className="text-sm">
          Movimento de estoque no período: o que entrou (compras + produção + contagem inicial), o que saiu (vendas / consumo em produção), perdas, ajustes de contagem. <strong>Saldo positivo</strong> = sobra, <strong>negativo</strong> = saiu mais do que entrou.
        </p>
      </Card>

      {/* Cards de topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><div className="eyebrow">Valor de insumos</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{fmtBR(valorInsumos)}</div></Card>
        <Card><div className="eyebrow">Itens c/ movimento</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{linhasInsumos.length + linhasPizzas.length + linhasBebidas.length}</div></Card>
        <Card className={perdasInsumos > 0 ? "border-vermelho border-[3px]" : ""}>
          <div className="eyebrow">Perdas insumos</div>
          <div className={`text-2xl font-[family-name:var(--font-titulo)] ${perdasInsumos > 0 ? "text-vermelho" : "text-verde"}`}>{perdasInsumos.toFixed(2)}</div>
        </Card>
        <Card><div className="eyebrow">Pizzas em saldo</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{linhasPizzas.reduce((s, l) => s + l.saldo, 0)}</div></Card>
      </div>

      <BlocoFechamento titulo="Insumos" items={linhasInsumos} comUnidade comValor />
      <BlocoFechamento titulo="Pizzas prontas" items={linhasPizzas} />
      <BlocoFechamento titulo="Bebidas" items={linhasBebidas} />
    </div>
  );
}

function BlocoFechamento({ titulo, items, comUnidade, comValor }: { titulo: string; items: any[]; comUnidade?: boolean; comValor?: boolean }) {
  if (items.length === 0) return (
    <section>
      <div className="eyebrow mb-2">// {titulo.toUpperCase()}</div>
      <Card variant="creme"><p className="text-xs text-preto/60">Sem movimentação no período.</p></Card>
    </section>
  );
  return (
    <section>
      <div className="eyebrow mb-2">// {titulo.toUpperCase()}</div>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right w-20">Entrou</th>
              <th className="px-3 py-2 text-right w-20">Saiu</th>
              <th className="px-3 py-2 text-right w-20">Perdas</th>
              <th className="px-3 py-2 text-right w-20">Ajustes</th>
              <th className="px-3 py-2 text-right w-24">Saldo</th>
              {comValor && <th className="px-3 py-2 text-right w-28">Valor</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-preto/5">
                <td className="px-3 py-2">{it.nome}{comUnidade && <span className="text-xs text-preto/40 ml-1">({it.unidade_padrao})</span>}</td>
                <td className="px-3 py-2 text-right text-verde font-[family-name:var(--font-mono)]">{it.entradas > 0 ? `+${it.entradas.toFixed(2)}` : "—"}</td>
                <td className="px-3 py-2 text-right text-preto/70 font-[family-name:var(--font-mono)]">{it.saidas > 0 ? `−${it.saidas.toFixed(2)}` : "—"}</td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{it.perdas > 0 ? <span className="text-vermelho">−{it.perdas.toFixed(2)}</span> : "—"}</td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{it.ajustes !== 0 ? (
                  <span className={it.ajustes > 0 ? "text-verde" : "text-vermelho"}>{it.ajustes > 0 ? "+" : ""}{it.ajustes.toFixed(2)}</span>
                ) : "—"}</td>
                <td className={cn("px-3 py-2 text-right font-[family-name:var(--font-subtitulo)] flex items-center justify-end gap-1",
                  it.saldo > 0 ? "text-verde" : it.saldo < 0 ? "text-vermelho" : "text-preto/40")}>
                  {it.saldo > 0 ? <TrendingUp size={12} /> : it.saldo < 0 ? <TrendingDown size={12} /> : null}
                  {it.saldo > 0 ? "+" : ""}{it.saldo.toFixed(2)}
                </td>
                {comValor && <td className="px-3 py-2 text-right text-xs font-[family-name:var(--font-mono)]">{fmtBR(it.valor)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
