"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { salvarProducao } from "./actions";

type Produto = { id: string; codigo: string; nome: string; categoria: string };
type Massa = { id: string; nome: string; unidade_padrao: string };

export function ProducaoForm({ produtos, massas }: { produtos: Produto[]; massas: Massa[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [produtor, setProdutor] = useState("");
  const [obs, setObs] = useState("");
  const [qtds, setQtds] = useState<Record<string, string>>({});
  const [qtdsMassa, setQtdsMassa] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const itens = Object.entries(qtds)
      .filter(([, v]) => Number(v) > 0)
      .map(([produto_id, v]) => ({ produto_id, quantidade: Number(v) }));
    const itensMassa = Object.entries(qtdsMassa)
      .filter(([, v]) => Number(v) > 0)
      .map(([insumo_id, v]) => ({ insumo_id, quantidade: Number(v) }));
    if (itens.length === 0 && itensMassa.length === 0) return;
    const fd = new FormData();
    fd.set("data", data); fd.set("produtor", produtor); fd.set("observacoes", obs);
    fd.set("itens", JSON.stringify(itens));
    fd.set("itensMassa", JSON.stringify(itensMassa));
    startTransition(async () => {
      await salvarProducao(fd);
      setSalvo(true);
      setQtds({}); setQtdsMassa({});
      setTimeout(() => { setSalvo(false); router.refresh(); }, 1500);
    });
  }

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow block mb-1">Data da produção</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Produtor (opcional)</label>
            <input value={produtor} onChange={(e) => setProdutor(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" placeholder="Lucas / Ale" />
          </div>
        </div>
        <div>
          <label className="eyebrow block mb-1">Observações</label>
          <input value={obs} onChange={(e) => setObs(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" />
        </div>

        {massas.length > 0 && (
          <div className="border-t-2 border-preto/10 pt-3">
            <div className="eyebrow mb-2">// MASSAS PRODUZIDAS (PRA PIZZA DOCE)</div>
            <div className="space-y-1">
              {massas.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{m.nome}</span>
                  <input
                    type="number" min="0" step="1"
                    value={qtdsMassa[m.id] ?? ""}
                    onChange={(e) => setQtdsMassa({ ...qtdsMassa, [m.id]: e.target.value })}
                    className="w-24 px-2 py-1 border-2 border-preto rounded bg-creme-claro text-right font-[family-name:var(--font-mono)]"
                    placeholder="0"
                  />
                  <span className="text-xs text-preto/40 w-12">{m.unidade_padrao}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t-2 border-preto/10 pt-3">
          <div className="eyebrow mb-2">// PIZZAS SALGADAS PRODUZIDAS</div>
          <div className="space-y-1">
            {produtos.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{p.codigo} · {p.nome}</span>
                <input
                  type="number" min="0" step="1"
                  value={qtds[p.id] ?? ""}
                  onChange={(e) => setQtds({ ...qtds, [p.id]: e.target.value })}
                  className="w-24 px-2 py-1 border-2 border-preto rounded bg-creme-claro text-right font-[family-name:var(--font-mono)]"
                  placeholder="0"
                />
                <span className="text-xs text-preto/40 w-12">unid.</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t-2 border-preto/10">
          <Button type="submit" disabled={pending} variant="vermelho">
            {pending ? "Salvando..." : "Registrar lote"}
          </Button>
          {salvo && <span className="text-verde flex items-center gap-1 text-sm"><CheckCircle2 size={14} /> Lote registrado!</span>}
        </div>
      </form>
    </Card>
  );
}
