"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { salvarInsumo, deletarInsumo } from "./actions";
import { Trash2 } from "lucide-react";

type Insumo = { id: string; nome: string; unidade_padrao: string; custo_medio_atual: number | null; custo_origem: string; ativo: boolean };

export function InsumoForm({ modo, insumo }: { modo: "novo" | "editar"; insumo?: Insumo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState(insumo?.nome ?? "");
  const [unidade, setUnidade] = useState(insumo?.unidade_padrao ?? "kg");
  const [custo, setCusto] = useState(insumo?.custo_medio_atual?.toString() ?? "");
  const [ativo, setAtivo] = useState(insumo?.ativo ?? true);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (insumo) fd.set("id", insumo.id);
    fd.set("nome", nome); fd.set("unidade", unidade);
    if (custo) fd.set("custo_medio_atual", custo);
    fd.set("ativo", ativo ? "1" : "0");
    startTransition(async () => {
      await salvarInsumo(fd);
      router.push("/estoque/insumos");
    });
  }

  async function apagar() {
    if (!insumo || !confirm("Apagar insumo?")) return;
    const fd = new FormData(); fd.set("id", insumo.id);
    startTransition(async () => { await deletarInsumo(fd); router.push("/estoque/insumos"); });
  }

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="eyebrow block mb-1">Nome</label>
          <input required value={nome} onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow block mb-1">Unidade padrão</label>
            <select value={unidade} onChange={(e) => setUnidade(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="l">l</option>
              <option value="ml">ml</option>
              <option value="un">un</option>
            </select>
          </div>
          <div>
            <label className="eyebrow block mb-1">Custo manual (R$)</label>
            <input type="number" step="0.0001" value={custo} onChange={(e) => setCusto(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" placeholder="só pra seed/manual" />
          </div>
        </div>
        <p className="text-xs text-preto/60 font-[family-name:var(--font-mono)]">
          Quando NF-e for cadastrada, o custo é recalculado por média ponderada (§7.21).
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo
        </label>
        <div className="flex items-center justify-between pt-3 border-t-2 border-preto/10">
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} variant="vermelho">{pending ? "..." : "Salvar"}</Button>
            <Button type="button" onClick={() => router.back()} variant="creme">Cancelar</Button>
          </div>
          {insumo && <button type="button" onClick={apagar} className="text-sm text-preto/40 hover:text-vermelho flex items-center gap-1"><Trash2 size={14} /> Apagar</button>}
        </div>
      </form>
    </Card>
  );
}
