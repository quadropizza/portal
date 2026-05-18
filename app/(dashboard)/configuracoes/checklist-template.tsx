"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { salvarChecklistItem, deletarChecklistItem } from "./actions";

type Item = { id: string; ordem: number; titulo: string; descricao: string | null; dia_do_mes: number | null; ativo: boolean };

export function ChecklistTemplate({ items }: { items: Item[] }) {
  const [pending, startTransition] = useTransition();
  const [novo, setNovo] = useState<Partial<Item>>({ titulo: "", descricao: "", ordem: items.length + 1, ativo: true });

  function add() {
    if (!novo.titulo) return;
    const fd = new FormData();
    fd.set("ordem", String(novo.ordem ?? 0));
    fd.set("titulo", novo.titulo);
    fd.set("descricao", novo.descricao ?? "");
    if (novo.dia_do_mes != null) fd.set("dia_do_mes", String(novo.dia_do_mes));
    fd.set("ativo", "1");
    startTransition(async () => {
      await salvarChecklistItem(fd);
      setNovo({ titulo: "", descricao: "", ordem: items.length + 2, ativo: true });
    });
  }

  function toggle(item: Item) {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("ordem", String(item.ordem));
    fd.set("titulo", item.titulo);
    fd.set("descricao", item.descricao ?? "");
    if (item.dia_do_mes != null) fd.set("dia_do_mes", String(item.dia_do_mes));
    fd.set("ativo", item.ativo ? "0" : "1");
    startTransition(async () => { await salvarChecklistItem(fd); });
  }

  function remove(id: string) {
    if (!confirm("Remover do template?")) return;
    const fd = new FormData(); fd.set("id", id);
    startTransition(async () => { await deletarChecklistItem(fd); });
  }

  return (
    <Card className="p-0 overflow-hidden">
      <ul>
        {items.map((it) => (
          <li key={it.id} className={`px-3 py-2 border-t border-preto/5 first:border-t-0 flex items-center gap-2 text-sm ${!it.ativo ? "opacity-40" : ""}`}>
            <input type="checkbox" checked={it.ativo} onChange={() => toggle(it)} disabled={pending} className="shrink-0" />
            <span className="w-7 text-[10px] text-preto/40 font-[family-name:var(--font-mono)] shrink-0">#{it.ordem}</span>
            <span className="flex-1 min-w-0 truncate">{it.titulo}</span>
            {it.dia_do_mes && (
              <span className="text-[10px] text-preto/50 font-[family-name:var(--font-mono)] shrink-0">d{it.dia_do_mes}</span>
            )}
            <button onClick={() => remove(it.id)} className="text-preto/30 hover:text-vermelho shrink-0">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
      <div className="px-3 py-3 border-t-2 border-preto/10 bg-creme-claro flex flex-wrap gap-2">
        <input
          value={novo.titulo ?? ""}
          onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
          placeholder="Novo item do checklist"
          className="flex-1 min-w-[160px] px-2 py-1.5 border-2 border-preto rounded bg-white text-sm"
        />
        <input
          type="number" min="1" max="31"
          value={novo.dia_do_mes ?? ""}
          onChange={(e) => setNovo({ ...novo, dia_do_mes: e.target.value ? Number(e.target.value) : null })}
          placeholder="dia"
          className="w-16 px-2 py-1.5 border-2 border-preto rounded bg-white text-sm font-[family-name:var(--font-mono)]"
        />
        <Button type="button" onClick={add} disabled={pending || !novo.titulo} variant="vermelho">
          <Plus size={14} /> Add
        </Button>
      </div>
    </Card>
  );
}
