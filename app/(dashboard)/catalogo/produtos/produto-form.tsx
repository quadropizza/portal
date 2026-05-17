"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { salvarProduto, deletarProduto } from "./actions";
import { Trash2 } from "lucide-react";

type Produto = {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  preco_venda: number | null;
  produzido_em_lote: boolean;
  ativo: boolean;
};

export function ProdutoForm({
  modo, produto, codigoSugerido, categoriaSugerida,
}: {
  modo: "novo" | "editar";
  produto?: Produto;
  codigoSugerido?: string;
  categoriaSugerida?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [codigo, setCodigo] = useState(produto?.codigo ?? codigoSugerido ?? "");
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoria, setCategoria] = useState(produto?.categoria ?? categoriaSugerida ?? "pizza_grande");
  const [preco, setPreco] = useState(produto?.preco_venda?.toString() ?? "");
  const [emLote, setEmLote] = useState(produto?.produzido_em_lote ?? true);
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData();
    if (produto) fd.set("id", produto.id);
    fd.set("codigo", codigo);
    fd.set("nome", nome);
    fd.set("categoria", categoria);
    fd.set("preco_venda", preco);
    fd.set("produzido_em_lote", emLote ? "1" : "0");
    fd.set("ativo", ativo ? "1" : "0");
    startTransition(async () => {
      const r = await salvarProduto(fd);
      if (r.ok) router.push("/catalogo/produtos");
      else setErro(r.erro ?? "erro");
    });
  }

  async function apagar() {
    if (!produto) return;
    if (!confirm(`Apagar "${produto.nome}"? Histórico de vendas é preservado.`)) return;
    const fd = new FormData();
    fd.set("id", produto.id);
    startTransition(async () => {
      await deletarProduto(fd);
      router.push("/catalogo/produtos");
    });
  }

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="eyebrow block mb-1">Código (PDV)</label>
            <input
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]"
              placeholder="ex: 109"
            />
          </div>
          <div>
            <label className="eyebrow block mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro"
            >
              <option value="pizza_grande">Pizza grande</option>
              <option value="pizza_mini">Pizza mini</option>
              <option value="combo">Combo</option>
              <option value="bebida">Bebida</option>
              <option value="sobremesa">Sobremesa</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        <div>
          <label className="eyebrow block mb-1">Nome</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro"
            placeholder="ex: Mini Nutella"
          />
        </div>

        <div>
          <label className="eyebrow block mb-1">Preço de venda (R$)</label>
          <input
            type="number" step="0.01" min="0"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]"
            placeholder="12,90"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={emLote}
              onChange={(e) => setEmLote(e.target.checked)}
              className="w-4 h-4"
            />
            Produzido em lote (pizza · controla estoque de pizza pronta)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4"
            />
            Ativo (aparece em vendas e relatórios)
          </label>
        </div>

        {erro && (
          <div className="bg-vermelho text-white border-3 border-preto rounded-xl px-4 py-3 text-sm">
            {erro}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 border-t-2 border-preto/10">
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} variant="vermelho">
              {pending ? "Salvando..." : modo === "novo" ? "Cadastrar" : "Salvar"}
            </Button>
            <Button type="button" onClick={() => router.back()} variant="creme">Cancelar</Button>
          </div>
          {produto && (
            <button
              type="button"
              onClick={apagar}
              disabled={pending}
              className="text-sm text-preto/40 hover:text-vermelho flex items-center gap-1 font-[family-name:var(--font-subtitulo)]"
            >
              <Trash2 size={14} /> Apagar
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
