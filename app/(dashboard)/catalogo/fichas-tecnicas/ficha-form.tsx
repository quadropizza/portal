"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { fmtBR } from "@/lib/utils";
import { salvarFicha } from "./actions";

type Insumo = { id: string; nome: string; unidade_padrao: string; custo_medio_atual: number | null };
type ItemFicha = { id?: string; insumo_id: string; quantidade: string; unidade: string };

export function FichaForm({ produto, insumos, ficha }: {
  produto: { id: string; codigo: string; nome: string };
  insumos: Insumo[];
  ficha: { id: string; versao: number; itens: ItemFicha[] } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<ItemFicha[]>(
    ficha?.itens?.map((i: any) => ({ insumo_id: i.insumo_id, quantidade: i.quantidade.toString(), unidade: i.unidade })) ?? []
  );

  function add() {
    setItems([...items, { insumo_id: insumos[0]?.id ?? "", quantidade: "0", unidade: insumos[0]?.unidade_padrao ?? "kg" }]);
  }
  function remove(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, patch: Partial<ItemFicha>) {
    const novo = [...items]; novo[i] = { ...novo[i], ...patch }; setItems(novo);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("produto_id", produto.id);
    fd.set("itens", JSON.stringify(items.filter((it) => it.insumo_id && Number(it.quantidade) > 0)));
    startTransition(async () => {
      await salvarFicha(fd);
      router.push("/catalogo/fichas-tecnicas");
    });
  }

  const insumosMap = new Map(insumos.map((i) => [i.id, i]));
  const custoTotal = items.reduce((s, it) => {
    const ins = insumosMap.get(it.insumo_id);
    return s + (Number(ins?.custo_medio_atual ?? 0) * Number(it.quantidade));
  }, 0);

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Card>
        <div className="space-y-2">
          {items.map((it, i) => {
            const ins = insumosMap.get(it.insumo_id);
            const custo = Number(ins?.custo_medio_atual ?? 0) * Number(it.quantidade);
            return (
              <div key={i} className="flex items-center gap-2">
                <select value={it.insumo_id} onChange={(e) => updateItem(i, { insumo_id: e.target.value, unidade: insumosMap.get(e.target.value)?.unidade_padrao ?? "kg" })}
                  className="flex-1 px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-sm">
                  {insumos.map((ins) => <option key={ins.id} value={ins.id}>{ins.nome}</option>)}
                </select>
                <input type="number" step="0.001" min="0" value={it.quantidade} onChange={(e) => updateItem(i, { quantidade: e.target.value })}
                  className="w-24 px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-right text-sm font-[family-name:var(--font-mono)]" />
                <select value={it.unidade} onChange={(e) => updateItem(i, { unidade: e.target.value })}
                  className="w-16 px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-sm">
                  <option value="kg">kg</option><option value="g">g</option>
                  <option value="l">l</option><option value="ml">ml</option>
                  <option value="un">un</option>
                </select>
                <span className="w-20 text-right text-xs text-preto/60 font-[family-name:var(--font-mono)]">{custo > 0 ? fmtBR(custo) : "—"}</span>
                <button type="button" onClick={() => remove(i)} className="text-preto/40 hover:text-vermelho"><X size={14} /></button>
              </div>
            );
          })}
          <button type="button" onClick={add}
            className="flex items-center gap-1 text-sm text-vermelho hover:underline font-[family-name:var(--font-subtitulo)]">
            <Plus size={14} /> adicionar insumo
          </button>
        </div>
        <div className="mt-4 pt-3 border-t-2 border-preto/10 flex justify-between items-center">
          <span className="eyebrow">Custo total</span>
          <span className="font-[family-name:var(--font-titulo)] text-2xl">{fmtBR(custoTotal)}</span>
        </div>
      </Card>

      <p className="text-xs text-preto/60 font-[family-name:var(--font-mono)]">
        Salvar cria uma nova versão da ficha. Movimentos antigos de produção mantêm
        a versão usada na época (decisão §7.19).
      </p>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} variant="vermelho">{pending ? "Salvando..." : "Salvar ficha"}</Button>
        <Button type="button" onClick={() => router.back()} variant="creme">Cancelar</Button>
      </div>
    </form>
  );
}
