"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { uploadEParse } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fmtBR, fmtDataBR } from "@/lib/utils";

type Resumo = Awaited<ReturnType<typeof uploadEParse>>;

export function UploadForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<Resumo | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    const fd = new FormData();
    fd.set("arquivo", arquivo);
    setResultado(null);
    startTransition(async () => {
      const r = await uploadEParse(fd);
      setResultado(r);
      if (r.ok && fileRef.current) fileRef.current.value = "";
      if (r.ok) setArquivo(null);
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={enviar}>
        <label className={`card-bruto block cursor-pointer hover:bg-amarelo/10 transition-colors ${arquivo ? "bg-amarelo/20" : "bg-white"}`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-amarelo border-3 border-preto rounded-xl flex items-center justify-center shrink-0">
              <Upload size={28} />
            </div>
            <div className="flex-1 min-w-0">
              {arquivo ? (
                <>
                  <div className="font-[family-name:var(--font-subtitulo)] truncate">{arquivo.name}</div>
                  <div className="text-xs text-preto/60 font-[family-name:var(--font-mono)]">
                    {(arquivo.size / 1024 / 1024).toFixed(2)} MB · pronto pra enviar
                  </div>
                </>
              ) : (
                <>
                  <div className="font-[family-name:var(--font-subtitulo)]">Selecionar PDF do Fast Report</div>
                  <div className="text-xs text-preto/60">clique aqui pra escolher o arquivo</div>
                </>
              )}
            </div>
            {arquivo && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setArquivo(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="text-preto/40 hover:text-vermelho p-2"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </label>

        {arquivo && (
          <div className="mt-4">
            <Button type="submit" disabled={pending} variant="vermelho">
              {pending ? "Processando..." : "Enviar e processar"}
            </Button>
          </div>
        )}
      </form>

      {resultado && resultado.ok && resultado.resumo && (
        <Card className="border-verde bg-verde/5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={24} className="text-verde shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <div className="font-[family-name:var(--font-subtitulo)] text-lg">Processado!</div>
                <div className="text-sm">
                  {resultado.resumo.vendas_inseridas} vendas novas inseridas
                  {resultado.resumo.vendas_ignoradas > 0 && (
                    <span className="text-preto/60"> · {resultado.resumo.vendas_ignoradas} já existiam (ignoradas)</span>
                  )}
                </div>
              </div>
              <div className="text-sm grid grid-cols-2 gap-3">
                <div>
                  <div className="eyebrow">Período</div>
                  <div className="font-[family-name:var(--font-mono)]">
                    {resultado.resumo.periodo.inicio && fmtDataBR(resultado.resumo.periodo.inicio)}
                    {" → "}
                    {resultado.resumo.periodo.fim && fmtDataBR(resultado.resumo.periodo.fim)}
                  </div>
                </div>
                <div>
                  <div className="eyebrow">Faturamento total</div>
                  <div className="font-[family-name:var(--font-titulo)] text-xl">{fmtBR(resultado.resumo.faturamento_total)}</div>
                </div>
              </div>

              {resultado.resumo.produtos_sem_cadastro.length > 0 && (
                <div className="bg-amarelo/30 border-2 border-amarelo-escuro rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-amarelo-escuro" />
                    <strong>{resultado.resumo.produtos_sem_cadastro.length} produto(s) vendidos sem cadastro</strong>
                  </div>
                  <ul className="space-y-0.5 text-xs">
                    {resultado.resumo.produtos_sem_cadastro.slice(0, 10).map((p) => (
                      <li key={p.codigo} className="font-[family-name:var(--font-mono)]">
                        {p.codigo.padStart(4)} · {p.nome} <span className="text-preto/60">(qtd {p.qtd})</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/catalogo/produtos" className="text-xs font-[family-name:var(--font-subtitulo)] text-vermelho hover:underline block mt-2">
                    cadastrar →
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {resultado && !resultado.ok && (
        <Card className="border-vermelho bg-vermelho/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-vermelho shrink-0 mt-0.5" />
            <div>
              <div className="font-[family-name:var(--font-subtitulo)]">Erro</div>
              <div className="text-sm">{resultado.erro}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
