"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { lancarMovimentoInsumo } from "./actions";

type Insumo = { id: string; nome: string; unidade_padrao: string; custo_medio_atual: number | null; custo_origem: string; saldo: number };

export function InsumosMovForm({ insumos }: { insumos: Insumo[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<"contagem_inicial" | "entrada_nf" | "ajuste_contagem" | "perda">("contagem_inicial");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs] = useState("");
  const [qtds, setQtds] = useState<Record<string, string>>({});
  const [custos, setCustos] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const itens = Object.entries(qtds)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)))
      .map(([insumo_id, v]) => ({
        insumo_id, quantidade: Number(v),
        custo_unitario: custos[insumo_id] ? Number(custos[insumo_id]) : null,
      }));
    if (itens.length === 0) return;
    const fd = new FormData();
    fd.set("tipo", tipo); fd.set("data", data); fd.set("observacao", obs);
    fd.set("itens", JSON.stringify(itens));
    startTransition(async () => {
      await lancarMovimentoInsumo(fd);
      setSalvo(true); setQtds({}); setCustos({});
      setTimeout(() => { setSalvo(false); router.refresh(); }, 1500);
    });
  }

  const labelQtd = tipo === "contagem_inicial" ? "Qtd ATUAL em estoque"
                 : tipo === "entrada_nf" ? "Qtd da NF (entra +)"
                 : tipo === "perda" ? "Qtd perdida (vai como −)"
                 : "Ajuste (+/−)";

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="eyebrow block mb-1">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as any)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro text-sm">
              <option value="contagem_inicial">📋 Contagem inicial (zera p/ valor lançado)</option>
              <option value="entrada_nf">📥 Entrada NF (compra)</option>
              <option value="ajuste_contagem">⚖️ Ajuste por contagem</option>
              <option value="perda">🗑️ Perda</option>
            </select>
          </div>
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

        <div className="border-t-2 border-preto/10 pt-3">
          <div className="eyebrow mb-2">// {labelQtd}</div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {insumos.map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{i.nome}
                  <span className="text-[10px] text-preto/40 ml-1">({i.unidade_padrao})</span>
                </span>
                <span className="text-xs text-preto/40 font-[family-name:var(--font-mono)] w-16 text-right">
                  saldo: {Number(i.saldo).toFixed(2)}
                </span>
                <input type="number" step="0.001"
                  value={qtds[i.id] ?? ""}
                  onChange={(e) => setQtds({ ...qtds, [i.id]: e.target.value })}
                  className="w-20 px-2 py-1 border-2 border-preto rounded bg-creme-claro font-[family-name:var(--font-mono)] text-right"
                  placeholder="—" />
                {tipo === "entrada_nf" && (
                  <input type="number" step="0.001"
                    value={custos[i.id] ?? ""}
                    onChange={(e) => setCustos({ ...custos, [i.id]: e.target.value })}
                    className="w-20 px-2 py-1 border-2 border-preto rounded bg-creme-claro font-[family-name:var(--font-mono)] text-right text-xs"
                    placeholder="R$/un" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t-2 border-preto/10">
          <Button type="submit" disabled={pending} variant="vermelho">
            {pending ? "Salvando..." : "Salvar movimento"}
          </Button>
          {salvo && <span className="text-verde flex items-center gap-1 text-sm"><CheckCircle2 size={14} /> Salvo!</span>}
        </div>
      </form>
    </Card>
  );
}
