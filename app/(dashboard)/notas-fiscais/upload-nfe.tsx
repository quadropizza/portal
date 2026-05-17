"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { uploadNfe } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtBR } from "@/lib/utils";

export function UploadNfe() {
  const router = useRouter();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof uploadNfe>> | null>(null);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    const fd = new FormData(); fd.set("arquivo", arquivo);
    setResult(null);
    startTransition(async () => {
      const r = await uploadNfe(fd);
      setResult(r);
      if (r.ok) {
        setArquivo(null);
        if (r.obrigacao_id) {
          // PDF/imagem precisa preencher dados → redireciona
          if (r.resumo?.tipo?.includes("preencher")) {
            setTimeout(() => router.push(`/notas-fiscais/${r.obrigacao_id}`), 1000);
          }
        }
      }
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={enviar}>
        <label className={`card-bruto block cursor-pointer ${arquivo ? "bg-amarelo/20" : "bg-white"}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amarelo border-3 border-preto rounded-xl flex items-center justify-center"><Upload size={20} /></div>
            <div className="flex-1">
              {arquivo
                ? <><div className="font-[family-name:var(--font-subtitulo)] truncate">{arquivo.name}</div><div className="text-xs text-preto/60">{(arquivo.size/1024).toFixed(1)} KB</div></>
                : <><div className="font-[family-name:var(--font-subtitulo)]">Anexar NF / Boleto / DARF / FGTS</div><div className="text-xs text-preto/60">XML (NF-e), PDF ou foto JPEG/PNG</div></>}
            </div>
            {arquivo && <button type="button" onClick={() => setArquivo(null)} className="text-preto/40 hover:text-vermelho"><X size={18} /></button>}
          </div>
          <input type="file" accept=".xml,.pdf,.jpg,.jpeg,.png,application/xml,text/xml,application/pdf,image/*" className="hidden"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
        </label>
        {arquivo && <div className="mt-2"><Button type="submit" disabled={pending} variant="vermelho">{pending ? "Enviando..." : "Cadastrar"}</Button></div>}
      </form>

      {result?.ok && result.resumo && (
        <Card className="border-verde bg-verde/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-verde" />
            <div className="text-sm">
              <strong>{result.resumo.tipo}:</strong> {result.resumo.fornecedor}
              {result.resumo.valor > 0 && ` · ${fmtBR(result.resumo.valor)}`}
              {result.resumo.itens > 0 && ` · ${result.resumo.itens} item(s)`}
            </div>
          </div>
          {result.resumo.tipo.includes("preencher") && (
            <p className="text-xs mt-2 text-preto/70">Redirecionando pra preencher valor e vencimento...</p>
          )}
        </Card>
      )}
      {result && !result.ok && (
        <Card className="border-vermelho bg-vermelho/5">
          <div className="flex items-center gap-2 text-sm"><AlertTriangle size={16} className="text-vermelho" /> {result.erro}</div>
        </Card>
      )}
    </div>
  );
}
