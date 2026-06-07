"use client";

import { useState, useTransition } from "react";
import { Upload, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { uploadExtrato, confirmarSaidas, type UploadExtratoResult } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtBR, fmtDataBR } from "@/lib/utils";

export function UploadExtrato() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<UploadExtratoResult | null>(null);
  const [editados, setEditados] = useState<Map<number, Partial<{ categoria_id: string; ignorar: boolean }>>>(new Map());
  const [confirmacao, setConfirmacao] = useState<{ inseridas: number; ignoradas: number } | null>(null);

  function processar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    const fd = new FormData();
    fd.set("arquivo", arquivo);
    setResult(null);
    setEditados(new Map());
    startTransition(async () => {
      const r = await uploadExtrato(fd);
      setResult(r);
    });
  }

  async function confirmar() {
    if (!result?.ok || !result.preview) return;
    const payload = result.preview.saidas
      .map((s, i) => ({ s, edit: editados.get(i) }))
      .filter(({ edit }) => !edit?.ignorar)
      .map(({ s, edit }) => ({
        data: s.data,
        descricao_original: s.descricao_original,
        descricao: s.descricao_original,
        valor: s.valor,
        categoria_id: edit?.categoria_id ?? s.categoria_sugerida_id,
        fornecedor_id: s.fornecedor_id,
        obrigacao_id: s.obrigacao_id,
        forma_pagamento: mapForma(s.tipo_movimento),
      }));

    const fd = new FormData();
    fd.set("arquivo_id", result.preview.arquivo_id);
    fd.set("saidas", JSON.stringify(payload));
    setConfirmacao(null);
    startTransition(async () => {
      const r = await confirmarSaidas(fd);
      setResult(null);
      setArquivo(null);
      if (r.ok) setConfirmacao({ inseridas: r.inseridas, ignoradas: r.ignoradas });
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={processar}>
        <label className={`card-bruto block cursor-pointer hover:bg-amarelo/10 ${arquivo ? "bg-amarelo/20" : "bg-white"}`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amarelo border-3 border-preto rounded-xl flex items-center justify-center shrink-0">
              <Upload size={24} />
            </div>
            <div className="flex-1 min-w-0">
              {arquivo ? (
                <>
                  <div className="font-[family-name:var(--font-subtitulo)] truncate">{arquivo.name}</div>
                  <div className="text-xs text-preto/60">{(arquivo.size/1024/1024).toFixed(2)} MB</div>
                </>
              ) : (
                <>
                  <div className="font-[family-name:var(--font-subtitulo)]">PDF do extrato Sicredi</div>
                  <div className="text-xs text-preto/60">clique pra escolher</div>
                </>
              )}
            </div>
            {arquivo && (
              <button type="button" onClick={() => setArquivo(null)} className="text-preto/40 hover:text-vermelho p-2">
                <X size={18} />
              </button>
            )}
          </div>
          <input type="file" accept="application/pdf,.pdf" className="hidden"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
        </label>
        {arquivo && (
          <div className="mt-3">
            <Button type="submit" disabled={pending} variant="vermelho">
              {pending ? "Processando..." : "Processar extrato"}
            </Button>
          </div>
        )}
      </form>

      {result && !result.ok && (
        <Card className="border-vermelho bg-vermelho/5">
          <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-vermelho" /> {result.erro}</div>
        </Card>
      )}

      {confirmacao && (
        <Card className="border-verde bg-verde/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-verde" />
            <span className="text-sm">
              <strong>{confirmacao.inseridas} saída(s) lançada(s).</strong>
              {confirmacao.ignoradas > 0 && (
                <span className="text-preto/60"> {confirmacao.ignoradas} já existiam e foram ignoradas (sem duplicar).</span>
              )}
            </span>
          </div>
        </Card>
      )}

      {result?.ok && result.preview && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="eyebrow">// REVISAR · {result.preview.saidas.length} saídas</div>
              <div className="text-xs font-[family-name:var(--font-mono)] text-preto/60">
                {fmtDataBR(result.preview.periodo.inicio)} → {fmtDataBR(result.preview.periodo.fim)} ·
                total {fmtBR(result.preview.total_saidas_valor)}
              </div>
            </div>
            <Button onClick={confirmar} disabled={pending} variant="vermelho">
              <CheckCircle2 size={16} /> Confirmar {result.preview.saidas.length - editados.size} saídas
            </Button>
          </div>

          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-creme-claro border-b-2 border-preto">
                <tr>
                  <th className="px-2 py-2 text-left w-20">Data</th>
                  <th className="px-2 py-2 text-left">Descrição</th>
                  <th className="px-2 py-2 text-left w-32">Tipo</th>
                  <th className="px-2 py-2 text-left w-40">Categoria sugerida</th>
                  <th className="px-2 py-2 text-right w-24">Valor</th>
                  <th className="px-2 py-2 w-14"></th>
                </tr>
              </thead>
              <tbody>
                {result.preview.saidas.map((s, i) => {
                  const edit = editados.get(i);
                  const ignorada = edit?.ignorar ?? false;
                  return (
                    <tr key={i} className={`border-t border-preto/5 ${ignorada ? "opacity-30 line-through" : ""}`}>
                      <td className="px-2 py-1.5 font-[family-name:var(--font-mono)]">{fmtDataBR(s.data)}</td>
                      <td className="px-2 py-1.5 truncate max-w-xs">
                        {s.descricao_original}
                        {s.obrigacao_id && (
                          <span className="ml-2 inline-block bg-verde text-white text-[10px] px-1 rounded">
                            casa com NF
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-preto/60">{s.tipo_movimento}</td>
                      <td className="px-2 py-1.5">
                        {s.categoria_sugerida_nome
                          ? <span className="bg-preto text-amarelo px-1.5 py-0.5 rounded text-[10px] font-[family-name:var(--font-mono)]">{s.categoria_sugerida_nome}</span>
                          : <span className="text-vermelho text-xs">— precisa</span>}
                      </td>
                      <td className="px-2 py-1.5 text-right font-[family-name:var(--font-subtitulo)] text-vermelho">{fmtBR(s.valor)}</td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => {
                            const m = new Map(editados);
                            const cur = m.get(i) ?? {};
                            m.set(i, { ...cur, ignorar: !ignorada });
                            setEditados(m);
                          }}
                          className="text-preto/40 hover:text-vermelho"
                          title={ignorada ? "Restaurar" : "Ignorar"}
                        >
                          {ignorada ? "↺" : <X size={14} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function mapForma(tipo: string): string {
  if (tipo === "PIX enviado") return "pix";
  if (tipo === "Boleto") return "boleto";
  if (tipo === "Cartão") return "cartao";
  if (tipo === "Fatura débito conta") return "debito_conta";
  return "outros";
}
