"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { fmtBR, fmtPct, cn } from "@/lib/utils";
import { salvarComponentes } from "./actions";

type Combo = { id: string; codigo: string; nome: string; preco_venda: number };
type Componente = { id?: string; produto_id: string; quantidade: number; produto?: { nome: string; categoria: string; preco_venda: number } };
type Produto = { id: string; codigo: string; nome: string; categoria: string; preco_venda: number };

export function ComboForm({ combo, componentes, produtos }: { combo: Combo; componentes: Componente[]; produtos: Produto[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<Componente[]>(
    componentes.map((c) => ({ produto_id: c.produto_id, quantidade: c.quantidade, produto: c.produto }))
  );

  const prodMap = new Map(produtos.map((p) => [p.id, p]));

  function add() {
    setItems([...items, { produto_id: produtos[0]?.id ?? "", quantidade: 1 }]);
  }
  function remove(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, patch: Partial<Componente>) {
    const novo = [...items]; novo[i] = { ...novo[i], ...patch }; setItems(novo);
  }

  // Custo: usar preço de venda como proxy de custo individual (TODO: usar custo real da ficha)
  // Real: vai usar combo_custo view do servidor
  const precoVendaSomado = items.reduce((s, it) => {
    const p = prodMap.get(it.produto_id);
    return s + Number(p?.preco_venda ?? 0) * Number(it.quantidade);
  }, 0);
  const descontoCombo = precoVendaSomado - Number(combo.preco_venda);
  const pctDesconto = precoVendaSomado > 0 ? descontoCombo / precoVendaSomado : 0;

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("combo_id", combo.id);
    fd.set("componentes", JSON.stringify(items.filter((it) => it.produto_id && it.quantidade > 0)));
    startTransition(async () => {
      await salvarComponentes(fd);
      router.push("/catalogo/produtos");
    });
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Card>
        <div className="eyebrow mb-3">// COMPONENTES DO COMBO</div>
        <div className="space-y-2">
          {items.map((it, i) => {
            const p = prodMap.get(it.produto_id);
            const subtotal = Number(p?.preco_venda ?? 0) * it.quantidade;
            return (
              <div key={i} className="flex items-center gap-2">
                <select value={it.produto_id} onChange={(e) => updateItem(i, { produto_id: e.target.value })}
                  className="flex-1 px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-sm">
                  {produtos.map((pr) => <option key={pr.id} value={pr.id}>{pr.nome} ({fmtBR(pr.preco_venda)})</option>)}
                </select>
                <input type="number" min="1" value={it.quantidade} onChange={(e) => updateItem(i, { quantidade: Number(e.target.value) })}
                  className="w-16 px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-right font-[family-name:var(--font-mono)]" />
                <span className="w-24 text-right text-sm font-[family-name:var(--font-subtitulo)]">{fmtBR(subtotal)}</span>
                <button type="button" onClick={() => remove(i)} className="text-preto/40 hover:text-vermelho"><X size={14} /></button>
              </div>
            );
          })}
          <button type="button" onClick={add} className="text-sm text-vermelho hover:underline font-[family-name:var(--font-subtitulo)] flex items-center gap-1">
            <Plus size={14} /> adicionar componente
          </button>
        </div>

        <div className="mt-4 pt-3 border-t-2 border-preto/10 space-y-1 text-sm">
          <div className="flex justify-between"><span className="eyebrow">Soma preço individual</span><span className="font-[family-name:var(--font-mono)]">{fmtBR(precoVendaSomado)}</span></div>
          <div className="flex justify-between"><span className="eyebrow">Preço do combo</span><span className="font-[family-name:var(--font-mono)]">{fmtBR(combo.preco_venda)}</span></div>
          <div className={cn("flex justify-between pt-1 border-t border-preto/10", descontoCombo > 0 ? "text-vermelho" : "text-verde")}>
            <span className="font-[family-name:var(--font-subtitulo)]">{descontoCombo > 0 ? "Desconto pro cliente" : "Margem extra"}</span>
            <span className="font-[family-name:var(--font-mono)]">{fmtBR(Math.abs(descontoCombo))} ({fmtPct(Math.abs(pctDesconto))})</span>
          </div>
          <div className="text-[11px] text-preto/50 font-[family-name:var(--font-mono)] mt-2">
            💡 Custo real (via ficha técnica dos itens) é calculado quando você salvar e aparece em /catalogo.
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} variant="vermelho">{pending ? "Salvando..." : "Salvar componentes"}</Button>
        <Button type="button" onClick={() => router.back()} variant="creme">Cancelar</Button>
      </div>
    </form>
  );
}
