"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Trash2, Plus, X } from "lucide-react";
import { fmtBR } from "@/lib/utils";
import { salvarCustoFixo, marcarCustoPago, desfazerPagamento, deletarCustoFixo } from "./actions";

type Custo = {
  id: string; nome: string; valor_estimado: number; dia_vencimento: number | null;
  categoria_id: string | null; fornecedor_id: string | null; forma_pagamento: string;
  ativo: boolean;
};
type Pagamento = { id: string; custo_fixo_id: string; valor_pago: number; data_pagamento: string };
type Cat = { id: string; nome: string };
type Forn = { id: string; nome: string; apelido: string | null };

export function CustosFixosManager({ custos, pagamentosMes, categorias, fornecedores, ano, mes }: {
  custos: Custo[]; pagamentosMes: Pagamento[]; categorias: Cat[]; fornecedores: Forn[]; ano: number; mes: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [novoAberto, setNovoAberto] = useState(false);

  const pagMap = new Map(pagamentosMes.map((p) => [p.custo_fixo_id, p]));
  const catMap = new Map(categorias.map((c) => [c.id, c.nome]));
  const totalEstimado = custos.reduce((s, c) => s + Number(c.valor_estimado), 0);
  const totalPago = pagamentosMes.reduce((s, p) => s + Number(p.valor_pago), 0);
  const totalPendente = custos.filter((c) => !pagMap.has(c.id)).reduce((s, c) => s + Number(c.valor_estimado), 0);

  function marcarPago(custo: Custo) {
    const valorStr = prompt(`Valor pago de "${custo.nome}":`, custo.valor_estimado.toFixed(2));
    if (!valorStr) return;
    const valor = Number(valorStr.replace(",", "."));
    const dataStr = prompt("Data do pagamento (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    if (!dataStr) return;
    const forma = prompt("Forma (pix / debito_conta / boleto / dinheiro):", custo.forma_pagamento) ?? "pix";
    const fd = new FormData();
    fd.set("custo_id", custo.id); fd.set("valor", String(valor));
    fd.set("data", dataStr); fd.set("forma", forma);
    fd.set("ano", String(ano)); fd.set("mes", String(mes));
    startTransition(async () => {
      const r = await marcarCustoPago(fd);
      if (!r.ok) alert(r.erro);
      router.refresh();
    });
  }

  function desfazer(pagamentoId: string) {
    if (!confirm("Desfazer pagamento? A saída gerada será apagada.")) return;
    const fd = new FormData(); fd.set("pagamento_id", pagamentoId);
    startTransition(async () => { await desfazerPagamento(fd); router.refresh(); });
  }

  function apagar(id: string, nome: string) {
    if (!confirm(`Apagar custo fixo "${nome}"?`)) return;
    const fd = new FormData(); fd.set("id", id);
    startTransition(async () => { await deletarCustoFixo(fd); router.refresh(); });
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><div className="eyebrow">Total estimado/mês</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{fmtBR(totalEstimado)}</div></Card>
        <Card><div className="eyebrow">Pago neste mês</div><div className="text-2xl font-[family-name:var(--font-titulo)] text-verde">{fmtBR(totalPago)}</div></Card>
        <Card className={totalPendente > 0 ? "border-vermelho border-[3px]" : ""}>
          <div className="eyebrow">Pendente</div>
          <div className={`text-2xl font-[family-name:var(--font-titulo)] ${totalPendente > 0 ? "text-vermelho" : "text-verde"}`}>{fmtBR(totalPendente)}</div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setNovoAberto(true)} variant="vermelho"><Plus size={14} /> Novo custo fixo</Button>
      </div>

      {novoAberto && <FormNovo categorias={categorias} fornecedores={fornecedores}
        onSalvo={() => { setNovoAberto(false); router.refresh(); }}
        onCancelar={() => setNovoAberto(false)} />}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left w-40">Categoria</th>
              <th className="px-3 py-2 text-right w-24">Valor</th>
              <th className="px-3 py-2 text-center w-16">Dia</th>
              <th className="px-3 py-2 text-center w-28">Status</th>
              <th className="px-3 py-2 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {custos.map((c) => {
              const pag = pagMap.get(c.id);
              return (
                <tr key={c.id} className={`border-t border-preto/5 ${pag ? "bg-verde/5" : ""}`}>
                  <td className="px-3 py-2 font-[family-name:var(--font-subtitulo)]">{c.nome}</td>
                  <td className="px-3 py-2 text-xs text-preto/60">{catMap.get(c.categoria_id ?? "") ?? <span className="text-vermelho">—</span>}</td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{fmtBR(c.valor_estimado)}</td>
                  <td className="px-3 py-2 text-center text-xs">{c.dia_vencimento ?? "—"}</td>
                  <td className="px-3 py-2 text-center">
                    {pag ? (
                      <span className="text-xs text-verde flex items-center justify-center gap-1">
                        <CheckCircle2 size={12} /> pago {fmtBR(pag.valor_pago)}
                      </span>
                    ) : (
                      <span className="text-xs text-vermelho">pendente</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {pag ? (
                      <button onClick={() => desfazer(pag.id)} className="text-xs text-preto/40 hover:text-vermelho">desfazer</button>
                    ) : (
                      <button onClick={() => marcarPago(c)} disabled={pending}
                        className="text-xs bg-vermelho text-white px-2 py-1 rounded font-[family-name:var(--font-subtitulo)]">
                        marcar pago
                      </button>
                    )}
                    <button onClick={() => apagar(c.id, c.nome)} className="text-preto/30 hover:text-vermelho ml-2"><Trash2 size={12} /></button>
                  </td>
                </tr>
              );
            })}
            {custos.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-preto/50">Nenhum custo fixo cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function FormNovo({ categorias, fornecedores, onSalvo, onCancelar }: { categorias: Cat[]; fornecedores: Forn[]; onSalvo: () => void; onCancelar: () => void }) {
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("");
  const [cat, setCat] = useState("");
  const [forn, setForn] = useState("");
  const [forma, setForma] = useState("pix");

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("nome", nome); fd.set("valor", valor); fd.set("dia", dia);
    fd.set("categoria_id", cat); fd.set("fornecedor_id", forn);
    fd.set("forma", forma); fd.set("ativo", "1");
    startTransition(async () => {
      const r = await salvarCustoFixo(fd);
      if (r.ok) onSalvo(); else alert(r.erro);
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="eyebrow">// NOVO CUSTO FIXO</div>
        <button onClick={onCancelar} className="text-preto/40 hover:text-vermelho"><X size={16} /></button>
      </div>
      <form onSubmit={salvar} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="eyebrow block mb-1">Nome</label>
          <input required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" />
        </div>
        <div>
          <label className="eyebrow block mb-1">Valor estimado (R$)</label>
          <input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
        </div>
        <div>
          <label className="eyebrow block mb-1">Dia do vencimento (1-31)</label>
          <input type="number" min="1" max="31" value={dia} onChange={(e) => setDia(e.target.value)} className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
        </div>
        <div>
          <label className="eyebrow block mb-1">Categoria (DRE)</label>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
            <option value="">—</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="eyebrow block mb-1">Forma pagamento padrão</label>
          <select value={forma} onChange={(e) => setForma(e.target.value)} className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
            <option value="pix">PIX</option><option value="debito_conta">Débito conta</option>
            <option value="boleto">Boleto</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option>
          </select>
        </div>
        <div className="col-span-2 flex gap-2 pt-2">
          <Button type="submit" disabled={pending || !nome || !valor} variant="vermelho">{pending ? "..." : "Salvar"}</Button>
          <Button type="button" onClick={onCancelar} variant="creme">Cancelar</Button>
        </div>
      </form>
    </Card>
  );
}
