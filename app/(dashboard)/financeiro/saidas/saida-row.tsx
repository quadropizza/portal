"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { trocarCategoria, criarCategoria } from "./actions";
import { fmtBR, fmtDataBR } from "@/lib/utils";
import { Check, Plus } from "lucide-react";

type Categoria = { id: string; nome: string; grupo: string };
type Saida = {
  id: string; data: string; descricao_original: string; descricao: string | null;
  valor: number; categoria_id: string | null; forma_pagamento: string | null;
  categoria: { id: string; nome: string; grupo: string } | null;
  fornecedor: { id: string; apelido: string | null; nome: string } | null;
};

export function SaidaRow({ saida, categorias }: { saida: Saida; categorias: Categoria[] }) {
  const [pending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function onChange(novaCatId: string) {
    if (novaCatId === "__nova__") {
      const nome = prompt("Nome da nova categoria:");
      if (!nome) return;
      const grupo = prompt("Grupo (cmv / folha / impostos / aluguel / bancarias / outros):", "outros") ?? "outros";
      const fd = new FormData();
      fd.set("nome", nome); fd.set("grupo", grupo);
      startTransition(async () => {
        const r = await criarCategoria(fd);
        if (r.ok && r.id) {
          const fd2 = new FormData();
          fd2.set("id", saida.id); fd2.set("categoria_id", r.id);
          await trocarCategoria(fd2);
          setSalvo(true);
          setTimeout(() => setSalvo(false), 1500);
        } else {
          alert(r.erro ?? "erro");
        }
      });
      return;
    }
    const fd = new FormData();
    fd.set("id", saida.id);
    fd.set("categoria_id", novaCatId);
    startTransition(async () => {
      await trocarCategoria(fd);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1500);
    });
  }

  return (
    <tr className={`border-t border-preto/5 hover:bg-amarelo/10 ${pending ? "opacity-50" : ""}`}>
      <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-xs">{fmtDataBR(saida.data)}</td>
      <td className="px-3 py-2 truncate max-w-md">
        <div className="text-sm">{saida.descricao ?? saida.descricao_original}</div>
        {saida.fornecedor && (
          <div className="text-xs text-preto/50">{saida.fornecedor.apelido ?? saida.fornecedor.nome}</div>
        )}
      </td>
      <td className="px-3 py-2">
        <select
          value={saida.categoria_id ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={pending}
          className={`text-xs px-2 py-1 border-2 rounded font-[family-name:var(--font-mono)] w-full ${
            saida.categoria_id ? "border-preto bg-creme-claro" : "border-vermelho bg-vermelho/5 text-vermelho"
          }`}
        >
          <option value="">— escolher —</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {salvo && <Check size={14} className="text-verde inline ml-1" />}
      </td>
      <td className="px-3 py-2 text-right font-[family-name:var(--font-subtitulo)] text-vermelho">{fmtBR(saida.valor)}</td>
      <td className="px-3 py-2">
        <Link href={`/financeiro/saidas/${saida.id}`} className="text-xs text-vermelho hover:underline">editar</Link>
      </td>
    </tr>
  );
}
