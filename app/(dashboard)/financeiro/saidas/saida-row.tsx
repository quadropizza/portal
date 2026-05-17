"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { trocarCategoria, sugerirCatEObrig, aceitarSugestao } from "./actions";
import { fmtBR, fmtDataBR } from "@/lib/utils";
import { Check, Sparkles, X } from "lucide-react";
import { CategoriaNovaModal } from "@/components/ui/categoria-nova-modal";

type Categoria = { id: string; nome: string; grupo: string };
type Saida = {
  id: string; data: string; descricao_original: string; descricao: string | null;
  valor: number; categoria_id: string | null; forma_pagamento: string | null;
  obrigacao_id: string | null;
  categoria: { id: string; nome: string; grupo: string } | null;
  fornecedor: { id: string; apelido: string | null; nome: string } | null;
};

type Sugestao = { categoria_id: string | null; categoria_nome: string | null; motivo: string | null; obrigacao_id: string | null; obrigacao_resumo: string | null };

export function SaidaRow({ saida, categorias }: { saida: Saida; categorias: Categoria[] }) {
  const [pending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);
  const [mostrarSelect, setMostrarSelect] = useState(false);

  function aplicarCategoria(catId: string) {
    const fd = new FormData(); fd.set("id", saida.id); fd.set("categoria_id", catId);
    startTransition(async () => {
      await trocarCategoria(fd);
      setSalvo(true); setMostrarSelect(false); setSugestao(null);
      setTimeout(() => setSalvo(false), 1500);
    });
  }

  function pedirSugestao() {
    startTransition(async () => {
      const s = await sugerirCatEObrig(saida.id);
      setSugestao(s);
    });
  }

  function aceitar() {
    if (!sugestao?.categoria_id) return;
    const fd = new FormData();
    fd.set("id", saida.id);
    fd.set("categoria_id", sugestao.categoria_id);
    if (sugestao.obrigacao_id) fd.set("obrigacao_id", sugestao.obrigacao_id);
    startTransition(async () => {
      await aceitarSugestao(fd);
      setSalvo(true); setSugestao(null);
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
        {saida.obrigacao_id && (
          <div className="text-[10px] text-verde font-[family-name:var(--font-mono)]">✓ vinculada a NF</div>
        )}
      </td>
      <td className="px-3 py-2">
        {saida.categoria_id ? (
          <span className="text-xs px-2 py-1 border-2 border-preto bg-creme-claro rounded font-[family-name:var(--font-mono)] inline-flex items-center gap-1">
            {saida.categoria?.nome ?? "?"}
            <button onClick={() => setMostrarSelect(true)} className="text-preto/40 hover:text-vermelho ml-1" title="Trocar">
              <X size={10} />
            </button>
          </span>
        ) : sugestao ? (
          <div className="space-y-1">
            {sugestao.categoria_nome ? (
              <div className="text-xs space-y-1">
                <div className="bg-amarelo border-2 border-preto px-2 py-1 rounded">
                  <Sparkles size={10} className="inline mr-1" />
                  <strong>Sugestão:</strong> {sugestao.categoria_nome}
                  <span className="text-[9px] text-preto/60 ml-1">({sugestao.motivo})</span>
                </div>
                {sugestao.obrigacao_resumo && (
                  <div className="bg-verde/20 border border-verde px-2 py-1 rounded text-[10px]">
                    + vincula: {sugestao.obrigacao_resumo}
                  </div>
                )}
                <div className="flex gap-1">
                  <button onClick={aceitar} className="text-[10px] bg-verde text-white px-2 py-0.5 rounded">aceitar</button>
                  <button onClick={() => { setSugestao(null); setMostrarSelect(true); }} className="text-[10px] bg-preto text-white px-2 py-0.5 rounded">outra</button>
                </div>
              </div>
            ) : (
              <div className="text-xs space-y-1">
                <div className="text-vermelho">Sem sugestão automática</div>
                <button onClick={() => { setSugestao(null); setMostrarSelect(true); }} className="text-[10px] bg-vermelho text-white px-2 py-0.5 rounded">escolher</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <button onClick={pedirSugestao} disabled={pending}
              className="text-xs px-2 py-1 border-2 border-vermelho bg-vermelho/5 text-vermelho rounded font-[family-name:var(--font-subtitulo)] flex items-center gap-1 hover:bg-vermelho hover:text-white">
              <Sparkles size={10} /> sugerir
            </button>
          </div>
        )}
        {mostrarSelect && (
          <div className="mt-1">
            <select onChange={(e) => {
              if (e.target.value === "__nova__") setModalAberto(true);
              else if (e.target.value) aplicarCategoria(e.target.value);
            }} className="text-xs px-2 py-1 border-2 border-preto rounded bg-creme-claro w-full">
              <option value="">— escolher —</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              <option value="__nova__">+ nova categoria…</option>
            </select>
          </div>
        )}
        {salvo && <Check size={14} className="text-verde inline ml-1" />}
        <CategoriaNovaModal aberto={modalAberto} fechar={() => setModalAberto(false)}
          onCriada={(id) => { setModalAberto(false); aplicarCategoria(id); }} />
      </td>
      <td className="px-3 py-2 text-right font-[family-name:var(--font-subtitulo)] text-vermelho">{fmtBR(saida.valor)}</td>
      <td className="px-3 py-2">
        <Link href={`/financeiro/saidas/${saida.id}`} className="text-xs text-vermelho hover:underline">editar</Link>
      </td>
    </tr>
  );
}
