"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { salvarContagem } from "./actions";

type Insumo = { id: string; nome: string; unidade_padrao: string; custo_medio_atual: number | null };
type SaldoAtual = { id: string; qtd: number };

export function ContagemInsumoForm({ insumos, saldoAtual }: { insumos: Insumo[]; saldoAtual: SaldoAtual[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs] = useState("");
  const [qtds, setQtds] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);

  const saldoMap = new Map(saldoAtual.map((s) => [s.id, s.qtd]));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const itens = Object.entries(qtds)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)))
      .map(([insumo_id, v]) => ({ insumo_id, quantidade_contada: Number(v) }));
    if (itens.length === 0) return;
    const fd = new FormData();
    fd.set("data", data); fd.set("observacoes", obs);
    fd.set("itens", JSON.stringify(itens));
    startTransition(async () => {
      await salvarContagem(fd);
      setSalvo(true); setQtds({});
      setTimeout(() => { setSalvo(false); router.refresh(); }, 1500);
    });
  }

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow block mb-1">Data da contagem</label>
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
          <div className="eyebrow mb-2">// QUANTIDADE QUE TEM HOJE NA COZINHA</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {insumos.map((i) => {
              const esp = saldoMap.get(i.id) ?? 0;
              const cont = qtds[i.id] ? Number(qtds[i.id]) : null;
              const div = cont != null ? cont - esp : null;
              return (
                <div key={i.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{i.nome}</span>
                  <span className="text-xs text-preto/40 font-[family-name:var(--font-mono)] w-16 text-right">
                    esp: {esp.toFixed(esp < 10 ? 2 : 0)}
                  </span>
                  <input type="number" step="0.01"
                    value={qtds[i.id] ?? ""}
                    onChange={(e) => setQtds({ ...qtds, [i.id]: e.target.value })}
                    className="w-20 px-2 py-1 border-2 border-preto rounded bg-creme-claro font-[family-name:var(--font-mono)] text-right"
                    placeholder="—" />
                  <span className="text-xs text-preto/40 font-[family-name:var(--font-mono)] w-6">{i.unidade_padrao}</span>
                  {div != null && Math.abs(div) > 0.001 && (
                    <span className={`text-xs w-16 text-right font-[family-name:var(--font-mono)] ${div > 0 ? "text-verde" : "text-vermelho"}`}>
                      {div > 0 ? "+" : ""}{div.toFixed(2)}
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
