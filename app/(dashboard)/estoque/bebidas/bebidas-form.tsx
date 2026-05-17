"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { lancarMovimentoBebida } from "./actions";

type Bebida = { produto_id: string; codigo: string; nome: string; saldo: number };

export function BebidasForm({ bebidas }: { bebidas: Bebida[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<"contagem_inicial" | "entrada" | "ajuste_contagem" | "perda">("contagem_inicial");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs] = useState("");
  const [qtds, setQtds] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const itens = Object.entries(qtds)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)))
      .map(([produto_id, v]) => ({ produto_id, quantidade: Number(v) }));
    if (itens.length === 0) return;
    const fd = new FormData();
    fd.set("tipo", tipo); fd.set("data", data); fd.set("observacao", obs);
    fd.set("itens", JSON.stringify(itens));
    startTransition(async () => {
      await lancarMovimentoBebida(fd);
      setSalvo(true); setQtds({});
      setTimeout(() => { setSalvo(false); router.refresh(); }, 1500);
    });
  }

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="eyebrow block mb-1">Tipo de lançamento</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as any)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro text-sm">
              <option value="contagem_inicial">Contagem inicial (zera)</option>
              <option value="entrada">Entrada (compra)</option>
              <option value="ajuste_contagem">Ajuste por contagem</option>
              <option value="perda">Perda</option>
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
          <div className="eyebrow mb-2">// {tipo === "contagem_inicial" ? "QUANTIDADE EM ESTOQUE HOJE" : tipo === "entrada" ? "QUANTIDADE QUE CHEGOU" : "DIFERENÇA (+/−)"}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {bebidas.map((b) => (
              <div key={b.produto_id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{b.nome}</span>
                <span className="text-xs text-preto/40 font-[family-name:var(--font-mono)] w-14 text-right">
                  saldo: {b.saldo}
                </span>
                <input type="number" step="1"
                  value={qtds[b.produto_id] ?? ""}
                  onChange={(e) => setQtds({ ...qtds, [b.produto_id]: e.target.value })}
                  className="w-20 px-2 py-1 border-2 border-preto rounded bg-creme-claro font-[family-name:var(--font-mono)] text-right"
                  placeholder="—" />
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
