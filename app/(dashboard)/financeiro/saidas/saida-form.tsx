"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { salvarSaidaManual, deletarSaida } from "./actions";
import { Trash2, Plus } from "lucide-react";
import { CategoriaNovaModal } from "@/components/ui/categoria-nova-modal";

type Cat = { id: string; nome: string; grupo: string };
type Forn = { id: string; nome: string; apelido: string | null };

export function SaidaForm({
  modo, saida, categorias, fornecedores,
}: {
  modo: "novo" | "editar";
  saida?: { id: string; data: string; descricao: string | null; valor: number; categoria_id: string | null; fornecedor_id: string | null; forma_pagamento: string | null };
  categorias: Cat[]; fornecedores: Forn[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [modalCat, setModalCat] = useState(false);
  const [data, setData] = useState(saida?.data ?? new Date().toISOString().split("T")[0]);
  const [descricao, setDescricao] = useState(saida?.descricao ?? "");
  const [valor, setValor] = useState(saida?.valor.toString() ?? "");
  const [categoria, setCategoria] = useState(saida?.categoria_id ?? "");
  const [fornecedor, setFornecedor] = useState(saida?.fornecedor_id ?? "");
  const [forma, setForma] = useState(saida?.forma_pagamento ?? "pix");

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData();
    if (saida) fd.set("id", saida.id);
    fd.set("data", data);
    fd.set("descricao", descricao);
    fd.set("valor", valor);
    fd.set("categoria_id", categoria);
    fd.set("fornecedor_id", fornecedor);
    fd.set("forma_pagamento", forma);
    startTransition(async () => {
      const r = await salvarSaidaManual(fd);
      if (r.ok) router.push("/financeiro/saidas");
      else setErro(r.erro ?? "erro");
    });
  }

  async function apagar() {
    if (!saida) return;
    if (!confirm("Apagar essa saída?")) return;
    const fd = new FormData(); fd.set("id", saida.id);
    startTransition(async () => { await deletarSaida(fd); router.push("/financeiro/saidas"); });
  }

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow block mb-1">Data</label>
            <input type="date" required value={data} onChange={(e) => setData(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Valor (R$)</label>
            <input type="number" step="0.01" min="0" required value={valor} onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
        </div>
        <div>
          <label className="eyebrow block mb-1">Descrição</label>
          <input required value={descricao} onChange={(e) => setDescricao(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" />
        </div>
        <div>
          <label className="eyebrow block mb-1 flex items-center justify-between">
            <span>Categoria</span>
            <button type="button" onClick={() => setModalCat(true)} className="text-[10px] text-vermelho hover:underline flex items-center gap-0.5">
              <Plus size={10} /> nova
            </button>
          </label>
          <CategoriaNovaModal aberto={modalCat} fechar={() => setModalCat(false)}
            onCriada={(id) => { setCategoria(id); window.location.reload(); }} />
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
            <option value="">— escolher —</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="eyebrow block mb-1">Fornecedor (opcional)</label>
          <select value={fornecedor} onChange={(e) => setFornecedor(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
            <option value="">—</option>
            {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.apelido ?? f.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="eyebrow block mb-1">Forma de pagamento</label>
          <select value={forma} onChange={(e) => setForma(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
            <option value="pix">PIX</option>
            <option value="boleto">Boleto</option>
            <option value="cartao">Cartão</option>
            <option value="debito_conta">Débito em conta</option>
            <option value="dinheiro">Dinheiro</option>
          </select>
        </div>
        {erro && <div className="bg-vermelho text-white border-3 border-preto rounded-xl px-4 py-3 text-sm">{erro}</div>}
        <div className="flex items-center justify-between gap-3 pt-3 border-t-2 border-preto/10">
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} variant="vermelho">{pending ? "Salvando..." : "Salvar"}</Button>
            <Button type="button" onClick={() => router.back()} variant="creme">Cancelar</Button>
          </div>
          {saida && (
            <button type="button" onClick={apagar} className="text-sm text-preto/40 hover:text-vermelho flex items-center gap-1">
              <Trash2 size={14} /> Apagar
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
