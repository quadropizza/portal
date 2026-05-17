"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { salvarContagem } from "./actions";
import { CheckCircle2 } from "lucide-react";

type Insumo = { id: string; nome: string; unidade_padrao: string; custo_medio_atual: number | null };

export function ContagemForm({ insumos }: { insumos: Insumo[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs] = useState("");
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const itens = Object.entries(quantidades)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)))
      .map(([insumo_id, v]) => ({ insumo_id, quantidade_contada: Number(v) }));
    if (itens.length === 0) return;
    const fd = new FormData();
    fd.set("data", data); fd.set("observacoes", obs);
    fd.set("itens", JSON.stringify(itens));
    startTransition(async () => {
      await salvarContagem(fd);
      setSalvo(true);
      setQuantidades({});
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
            <label className="eyebrow block mb-1">Observações</label>
            <input value={obs} onChange={(e) => setObs(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" placeholder="opcional" />
          </div>
        </div>

        <div className="border-t-2 border-preto/10 pt-3">
          <div className="eyebrow mb-2">// LANÇAR QUANTIDADES</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {insumos.map((i) => (
              <label key={i.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{i.nome}</span>
                <input
                  type="number" step="0.001"
                  value={quantidades[i.id] ?? ""}
                  onChange={(e) => setQuantidades({ ...quantidades, [i.id]: e.target.value })}
                  className="w-24 px-2 py-1 border-2 border-preto rounded bg-creme-claro font-[family-name:var(--font-mono)] text-right"
                  placeholder="—"
                />
                <span className="text-xs text-preto/50 font-[family-name:var(--font-mono)] w-8">{i.unidade_padrao}</span>
              </label>
            ))}
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
