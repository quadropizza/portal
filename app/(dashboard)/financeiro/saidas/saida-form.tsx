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
type NfAb = { id: string; numero: string | null; valor_total: number; valor_pago: number; data_vencimento: string; categoria_id: string | null; fornecedor_id: string | null; fornecedor: { apelido: string | null; nome: string } | null };
type CustoFix = { id: string; nome: string; valor_estimado: number; categoria_id: string | null; fornecedor_id: string | null; forma_pagamento: string };

export function SaidaForm({
  modo, saida, categorias, fornecedores, nfsAbertas = [], custosFixos = [],
}: {
  modo: "novo" | "editar";
  saida?: { id: string; data: string; descricao: string | null; valor: number; categoria_id: string | null; fornecedor_id: string | null; forma_pagamento: string | null };
  categorias: Cat[]; fornecedores: Forn[];
  nfsAbertas?: NfAb[]; custosFixos?: CustoFix[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [tipoVinculo, setTipoVinculo] = useState<"avulsa" | "nf" | "custo">("avulsa");
  const [nfSelecionada, setNfSelecionada] = useState("");
  const [custoSelecionado, setCustoSelecionado] = useState("");

  const [modalCat, setModalCat] = useState(false);
  const [data, setData] = useState(saida?.data ?? new Date().toISOString().split("T")[0]);
  const [descricao, setDescricao] = useState(saida?.descricao ?? "");
  const [valor, setValor] = useState(saida?.valor.toString() ?? "");
  const [categoria, setCategoria] = useState(saida?.categoria_id ?? "");
  const [fornecedor, setFornecedor] = useState(saida?.fornecedor_id ?? "");
  const [forma, setForma] = useState(saida?.forma_pagamento ?? "pix");

  // Auto-preenche quando seleciona uma NF
  function selecionarNf(id: string) {
    setNfSelecionada(id);
    if (!id) return;
    const nf = nfsAbertas.find((n) => n.id === id);
    if (!nf) return;
    const restante = Number(nf.valor_total) - Number(nf.valor_pago);
    setValor(restante.toFixed(2));
    setDescricao(`Pgto NF ${nf.numero ?? ""} · ${nf.fornecedor?.apelido ?? nf.fornecedor?.nome ?? ""}`.trim());
    if (nf.categoria_id) setCategoria(nf.categoria_id);
    if (nf.fornecedor_id) setFornecedor(nf.fornecedor_id);
  }

  function selecionarCusto(id: string) {
    setCustoSelecionado(id);
    if (!id) return;
    const c = custosFixos.find((x) => x.id === id);
    if (!c) return;
    setValor(c.valor_estimado.toFixed(2));
    setDescricao(`Custo fixo: ${c.nome}`);
    if (c.categoria_id) setCategoria(c.categoria_id);
    if (c.fornecedor_id) setFornecedor(c.fornecedor_id);
    if (c.forma_pagamento) setForma(c.forma_pagamento);
  }

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
    if (tipoVinculo === "nf" && nfSelecionada) fd.set("obrigacao_id", nfSelecionada);
    if (tipoVinculo === "custo" && custoSelecionado) fd.set("custo_fixo_id", custoSelecionado);
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
        {modo === "novo" && (
          <div className="bg-amarelo/20 border-3 border-preto rounded-lg p-3">
            <div className="eyebrow mb-2">// O QUE É ESSA SAÍDA?</div>
            <div className="flex gap-2 flex-wrap mb-2">
              <button type="button" onClick={() => { setTipoVinculo("avulsa"); setNfSelecionada(""); setCustoSelecionado(""); }}
                className={`px-3 py-1.5 border-2 border-preto rounded text-xs font-[family-name:var(--font-subtitulo)] ${tipoVinculo==="avulsa" ? "bg-vermelho text-white" : "bg-white"}`}>
                Despesa avulsa
              </button>
              <button type="button" onClick={() => setTipoVinculo("nf")}
                className={`px-3 py-1.5 border-2 border-preto rounded text-xs font-[family-name:var(--font-subtitulo)] ${tipoVinculo==="nf" ? "bg-vermelho text-white" : "bg-white"}`}>
                Pagamento de NF em aberto ({nfsAbertas.length})
              </button>
              <button type="button" onClick={() => setTipoVinculo("custo")}
                className={`px-3 py-1.5 border-2 border-preto rounded text-xs font-[family-name:var(--font-subtitulo)] ${tipoVinculo==="custo" ? "bg-vermelho text-white" : "bg-white"}`}>
                Custo fixo do mês ({custosFixos.length})
              </button>
            </div>
            {tipoVinculo === "nf" && (
              <select value={nfSelecionada} onChange={(e) => selecionarNf(e.target.value)}
                className="w-full px-3 py-2 border-2 border-preto rounded bg-white text-sm">
                <option value="">— escolher NF —</option>
                {nfsAbertas.map((n) => (
                  <option key={n.id} value={n.id}>
                    NF {n.numero ?? "?"} · {n.fornecedor?.apelido ?? n.fornecedor?.nome ?? "?"} · R$ {(Number(n.valor_total)-Number(n.valor_pago)).toFixed(2)} · vence {new Date(n.data_vencimento).toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            )}
            {tipoVinculo === "custo" && (
              <select value={custoSelecionado} onChange={(e) => selecionarCusto(e.target.value)}
                className="w-full px-3 py-2 border-2 border-preto rounded bg-white text-sm">
                <option value="">— escolher custo fixo —</option>
                {custosFixos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome} · ~R$ {Number(c.valor_estimado).toFixed(2)}</option>
                ))}
              </select>
            )}
          </div>
        )}
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
