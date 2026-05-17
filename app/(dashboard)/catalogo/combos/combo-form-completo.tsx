"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { fmtBR, fmtPct, cn } from "@/lib/utils";
import { salvarComboCompleto, deletarCombo } from "./actions";

type ProdutoFicha = {
  id: string; codigo: string; nome: string; categoria: string; preco_venda: number;
  fichas?: Array<{ ativa: boolean; itens?: Array<{ quantidade: number; insumo: { custo_medio_atual: number | null } | null }> }>;
};
type Combo = {
  id: string; codigo: string; nome: string; preco_venda: number; ativo: boolean;
};
type Componente = { produto_id: string; quantidade: number };

// Calcula custo de um produto a partir da ficha técnica
function custoUnitarioProduto(p: ProdutoFicha): { custo: number; semFicha: boolean } {
  const ficha = p.fichas?.find((f) => f.ativa);
  if (!ficha?.itens || ficha.itens.length === 0) return { custo: 0, semFicha: true };
  let custo = 0;
  for (const it of ficha.itens) {
    const c = Number(it.insumo?.custo_medio_atual ?? 0);
    custo += c * Number(it.quantidade);
  }
  return { custo, semFicha: false };
}

export function ComboFormCompleto({
  modo, combo, produtos, componentesIniciais = [],
}: {
  modo: "novo" | "editar";
  combo?: Combo;
  produtos: ProdutoFicha[];
  componentesIniciais?: Componente[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [codigo, setCodigo] = useState(combo?.codigo ?? "");
  const [nome, setNome] = useState(combo?.nome ?? "");
  const [preco, setPreco] = useState(combo?.preco_venda?.toString() ?? "");
  const [componentes, setComponentes] = useState<Componente[]>(componentesIniciais);

  const prodMap = new Map(produtos.map((p) => [p.id, p]));

  function add() {
    setComponentes([...componentes, { produto_id: produtos[0]?.id ?? "", quantidade: 1 }]);
  }
  function remove(i: number) { setComponentes(componentes.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, patch: Partial<Componente>) {
    const novo = [...componentes]; novo[i] = { ...novo[i], ...patch }; setComponentes(novo);
  }

  // Calculations
  const componentesDetalhe = componentes.map((it) => {
    const p = prodMap.get(it.produto_id);
    if (!p) return null;
    const { custo, semFicha } = custoUnitarioProduto(p);
    return {
      produto: p,
      quantidade: it.quantidade,
      custoUnit: custo,
      semFicha,
      precoIndividual: Number(p.preco_venda ?? 0),
      subtotal_custo: custo * it.quantidade,
      subtotal_preco: Number(p.preco_venda ?? 0) * it.quantidade,
    };
  }).filter((x): x is NonNullable<typeof x> => x != null);

  const custoTotal = componentesDetalhe.reduce((s, c) => s + c.subtotal_custo, 0);
  const precoSomado = componentesDetalhe.reduce((s, c) => s + c.subtotal_preco, 0);
  const precoCombo = Number(preco || 0);
  const lucro = precoCombo - custoTotal;
  const margem = precoCombo > 0 ? lucro / precoCombo : 0;
  const descontoCliente = precoSomado - precoCombo;
  const algumSemFicha = componentesDetalhe.some((c) => c.semFicha);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !codigo || !preco) return;
    const fd = new FormData();
    if (combo) fd.set("id", combo.id);
    fd.set("codigo", codigo); fd.set("nome", nome); fd.set("preco", preco);
    fd.set("componentes", JSON.stringify(componentes.filter((c) => c.produto_id && c.quantidade > 0)));
    startTransition(async () => {
      const r = await salvarComboCompleto(fd);
      if (r.ok) router.push("/catalogo/produtos");
      else alert(r.erro);
    });
  }

  async function apagar() {
    if (!combo || !confirm(`Apagar combo "${combo.nome}"?`)) return;
    const fd = new FormData(); fd.set("id", combo.id);
    startTransition(async () => { await deletarCombo(fd); router.push("/catalogo/produtos"); });
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      {/* Dados básicos */}
      <Card>
        <div className="eyebrow mb-3">// IDENTIFICAÇÃO</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="eyebrow block mb-1">Código (PDV)</label>
            <input required value={codigo} onChange={(e) => setCodigo(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" placeholder="C1" />
          </div>
          <div className="col-span-2">
            <label className="eyebrow block mb-1">Nome</label>
            <input required value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" placeholder="Combo Pizza + Refri" />
          </div>
        </div>
        <div className="mt-3">
          <label className="eyebrow block mb-1">Preço de venda do combo (R$)</label>
          <input type="number" step="0.01" required value={preco} onChange={(e) => setPreco(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
        </div>
      </Card>

      {/* Componentes */}
      <Card>
        <div className="eyebrow mb-3">// COMPONENTES (pizzas, bebidas, sobremesas)</div>
        <div className="space-y-2">
          {componentesDetalhe.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={componentes[i].produto_id}
                onChange={(e) => updateItem(i, { produto_id: e.target.value })}
                className="flex-1 px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-sm">
                {produtos.map((pr) => <option key={pr.id} value={pr.id}>
                  {pr.nome} ({fmtBR(pr.preco_venda)}) {custoUnitarioProduto(pr).semFicha ? "⚠️" : ""}
                </option>)}
              </select>
              <input type="number" min="1" value={componentes[i].quantidade}
                onChange={(e) => updateItem(i, { quantidade: Number(e.target.value) })}
                className="w-14 px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-right font-[family-name:var(--font-mono)] text-sm" />
              <span className="w-24 text-right text-xs font-[family-name:var(--font-mono)] text-preto/60">
                custo {fmtBR(it.subtotal_custo)} {it.semFicha && "⚠️"}
              </span>
              <button type="button" onClick={() => remove(i)} className="text-preto/40 hover:text-vermelho"><X size={14} /></button>
            </div>
          ))}
          <button type="button" onClick={add}
            className="flex items-center gap-1 text-sm text-vermelho hover:underline font-[family-name:var(--font-subtitulo)]">
            <Plus size={14} /> adicionar produto ao combo
          </button>
        </div>

        {algumSemFicha && (
          <div className="mt-3 bg-amarelo/30 border-2 border-amarelo-escuro rounded p-2 text-xs flex items-center gap-2">
            <AlertTriangle size={14} className="text-amarelo-escuro" />
            Algum produto sem ficha técnica — custo dele entra como zero. Cadastra a ficha pra cálculo certo.
          </div>
        )}

        {/* Resumo de custo/margem */}
        <div className="mt-4 pt-3 border-t-2 border-preto/10 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat r="Custo total" v={fmtBR(custoTotal)} cor="vermelho" />
          <Stat r="Preço combo" v={fmtBR(precoCombo)} />
          <Stat r="Lucro" v={fmtBR(lucro)} cor={lucro > 0 ? "verde" : "vermelho"} />
          <Stat r="Margem" v={fmtPct(margem)} cor={margem >= 0.5 ? "verde" : margem >= 0.3 ? "amarelo" : "vermelho"} />
        </div>
        {precoSomado > 0 && (
          <div className="mt-2 text-xs text-preto/60 font-[family-name:var(--font-mono)]">
            💡 Se cliente comprasse separado: {fmtBR(precoSomado)}. Combo desconta {fmtBR(descontoCliente)} ({fmtPct(precoSomado > 0 ? descontoCliente/precoSomado : 0)}).
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="submit" disabled={pending || componentes.length === 0} variant="vermelho">
            {pending ? "..." : <><CheckCircle2 size={14} /> Salvar combo</>}
          </Button>
          <Button type="button" onClick={() => router.back()} variant="creme">Cancelar</Button>
        </div>
        {combo && (
          <button type="button" onClick={apagar} className="text-sm text-preto/40 hover:text-vermelho">apagar combo</button>
        )}
      </div>
    </form>
  );
}

function Stat({ r, v, cor }: { r: string; v: string; cor?: "verde" | "vermelho" | "amarelo" }) {
  const corCls = cor === "verde" ? "text-verde" : cor === "vermelho" ? "text-vermelho" : cor === "amarelo" ? "text-amarelo-escuro" : "";
  return (
    <div className="bg-creme-claro border-2 border-preto rounded-lg p-2 text-center">
      <div className="text-[9px] font-[family-name:var(--font-mono)] uppercase text-preto/60">{r}</div>
      <div className={cn("text-base font-[family-name:var(--font-subtitulo)]", corCls)}>{v}</div>
    </div>
  );
}
