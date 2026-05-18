"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { salvarContagemPizza } from "./actions";

type Pizza = { id: string; codigo: string; nome: string; categoria: string };
type EstoqueAtual = { id: string; qtd: number };
type Massa = { id: string; nome: string; qtd: number };

export function ContagemPizzaForm({
  pizzas,
  estoqueAtual,
  massas,
}: {
  pizzas: Pizza[];
  estoqueAtual: EstoqueAtual[];
  massas: Massa[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs] = useState("");
  const [qtds, setQtds] = useState<Record<string, string>>({});
  const [qtdsMassa, setQtdsMassa] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);

  const estMap = new Map(estoqueAtual.map((e) => [e.id, e.qtd]));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const itens = Object.entries(qtds)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)))
      .map(([produto_id, v]) => ({ produto_id, quantidade_contada: Number(v) }));
    const itensMassa = Object.entries(qtdsMassa)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)))
      .map(([insumo_id, v]) => ({ insumo_id, quantidade_contada: Number(v) }));
    if (itens.length === 0 && itensMassa.length === 0) return;
    const fd = new FormData();
    fd.set("data", data); fd.set("observacoes", obs);
    fd.set("itens", JSON.stringify(itens));
    fd.set("itensMassa", JSON.stringify(itensMassa));
    startTransition(async () => {
      await salvarContagemPizza(fd);
      setSalvo(true); setQtds({}); setQtdsMassa({});
      setTimeout(() => { setSalvo(false); router.refresh(); }, 1500);
    });
  }

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow block mb-1">Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Observação</label>
            <input value={obs} onChange={(e) => setObs(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" placeholder="opcional" />
          </div>
        </div>

        {massas.length > 0 && (
          <div className="border-t-2 border-preto/10 pt-3">
            <div className="eyebrow mb-2">// MASSAS (PRA PIZZA DOCE)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {massas.map((m) => {
                const contado = qtdsMassa[m.id] ? Number(qtdsMassa[m.id]) : null;
                const divergencia = contado != null ? contado - m.qtd : null;
                return (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{m.nome}</span>
                    <span className="text-xs text-preto/40 font-[family-name:var(--font-mono)] w-16 text-right">
                      esp: {m.qtd.toFixed(0)}
                    </span>
                    <input
                      type="number" min="0" step="1"
                      value={qtdsMassa[m.id] ?? ""}
                      onChange={(e) => setQtdsMassa({ ...qtdsMassa, [m.id]: e.target.value })}
                      className="w-20 px-2 py-1 border-2 border-preto rounded bg-creme-claro font-[family-name:var(--font-mono)] text-right"
                      placeholder="—"
                    />
                    {divergencia != null && divergencia !== 0 && (
                      <span className={`text-xs w-12 text-right font-[family-name:var(--font-mono)] ${
                        divergencia > 0 ? "text-verde" : "text-vermelho"
                      }`}>
                        {divergencia > 0 ? "+" : ""}{divergencia}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t-2 border-preto/10 pt-3">
          <div className="eyebrow mb-2">// PIZZAS SALGADAS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {pizzas.map((p) => {
              const esperado = estMap.get(p.id) ?? 0;
              const contado = qtds[p.id] ? Number(qtds[p.id]) : null;
              const divergencia = contado != null ? contado - esperado : null;
              return (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{p.nome}</span>
                  <span className="text-xs text-preto/40 font-[family-name:var(--font-mono)] w-12 text-right">
                    esp: {esperado}
                  </span>
                  <input
                    type="number" min="0" step="1"
                    value={qtds[p.id] ?? ""}
                    onChange={(e) => setQtds({ ...qtds, [p.id]: e.target.value })}
                    className="w-20 px-2 py-1 border-2 border-preto rounded bg-creme-claro font-[family-name:var(--font-mono)] text-right"
                    placeholder="—"
                  />
                  {divergencia != null && divergencia !== 0 && (
                    <span className={`text-xs w-12 text-right font-[family-name:var(--font-mono)] ${
                      divergencia > 0 ? "text-verde" : "text-vermelho"
                    }`}>
                      {divergencia > 0 ? "+" : ""}{divergencia}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t-2 border-preto/10">
          <Button type="submit" disabled={pending} variant="vermelho">
            {pending ? "Salvando..." : "Salvar contagem"}
          </Button>
          {salvo && <span className="text-verde flex items-center gap-1 text-sm"><CheckCircle2 size={14} /> Salvo!</span>}
        </div>
      </form>
    </Card>
  );
}
