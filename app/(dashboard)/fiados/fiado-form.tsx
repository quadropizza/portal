"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { fmtBR } from "@/lib/utils";
import { abrirComanda } from "./actions";

type Produto = { id: string; codigo: string; nome: string; categoria: string; preco_venda: number | null };
type Item = { produto_id: string; quantidade: number };

export function FiadoForm({ produtos }: { produtos: Produto[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  const prodMap = new Map(produtos.map((p) => [p.id, p]));
  const total = items.reduce((s, it) => {
    const p = prodMap.get(it.produto_id);
    return s + (Number(p?.preco_venda ?? 0) * it.quantidade);
  }, 0);

  function addItem() {
    setItems([...items, { produto_id: produtos[0]?.id ?? "", quantidade: 1 }]);
  }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, patch: Partial<Item>) {
    const novo = [...items]; novo[i] = { ...novo[i], ...patch }; setItems(novo);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || items.length === 0) return;
    const fd = new FormData();
    fd.set("nome", nome); fd.set("telefone", telefone);
    fd.set("items", JSON.stringify(items));
    startTransition(async () => {
      const r = await abrirComanda(fd);
      if (r.ok) router.push(`/fiados/${r.id}`);
    });
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow block mb-1">Nome do cliente</label>
            <input required value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Telefone (WhatsApp)</label>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]"
              placeholder="47999999999" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="eyebrow mb-2">// ITENS DA COMANDA</div>
        <div className="space-y-2">
          {items.map((it, i) => {
            const p = prodMap.get(it.produto_id);
            return (
              <div key={i} className="flex items-center gap-2">
                <select value={it.produto_id} onChange={(e) => updateItem(i, { produto_id: e.target.value })}
                  className="flex-1 px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-sm">
                  {produtos.map((pr) => <option key={pr.id} value={pr.id}>{pr.nome} ({fmtBR(pr.preco_venda ?? 0)})</option>)}
                </select>
                <input type="number" min="1" value={it.quantidade} onChange={(e) => updateItem(i, { quantidade: Number(e.target.value) })}
                  className="w-16 px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-right font-[family-name:var(--font-mono)]" />
                <span className="w-20 text-right text-sm font-[family-name:var(--font-subtitulo)]">
                  {fmtBR(Number(p?.preco_venda ?? 0) * it.quantidade)}
                </span>
                <button type="button" onClick={() => removeItem(i)} className="text-preto/40 hover:text-vermelho"><X size={14} /></button>
              </div>
            );
          })}
          <button type="button" onClick={addItem} className="text-sm text-vermelho hover:underline font-[family-name:var(--font-subtitulo)] flex items-center gap-1">
            <Plus size={14} /> adicionar item
          </button>
        </div>
        <div className="flex justify-between items-center pt-3 border-t-2 border-preto/10 mt-3">
          <span className="eyebrow">Total</span>
          <span className="font-[family-name:var(--font-titulo)] text-2xl">{fmtBR(total)}</span>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || items.length === 0 || !nome} variant="vermelho">
          {pending ? "Abrindo..." : "Abrir comanda"}
        </Button>
        <Button type="button" onClick={() => router.back()} variant="creme">Cancelar</Button>
      </div>
    </form>
  );
}
