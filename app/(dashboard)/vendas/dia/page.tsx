import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { UploadForm } from "./upload-form";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtDataBR } from "@/lib/utils";
import { FileText, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VendasDiaPage() {
  const supabase = await createClient();

  // últimos uploads
  const { data: uploads } = await supabase
    .from("arquivo_anexo")
    .select("id, nome_original, data_upload, parsed, parsing_erro, tamanho_bytes")
    .eq("bucket", "pdv")
    .is("deleted_at", null)
    .order("data_upload", { ascending: false })
    .limit(10);

  // últimas vendas agregadas
  const { data: vendas } = await supabase
    .from("venda_diaria")
    .select("data, qtd_vendas, faturamento_bruto, pagamento_pix, pagamento_cartao_debito, pagamento_cartao_credito, pagamento_dinheiro")
    .is("deleted_at", null)
    .order("data", { ascending: false })
    .limit(14);

  return (
    <div className="space-y-10 max-w-5xl">
      <EyebrowTitle
        eyebrow="// VENDAS · ALIMENTAR DIA"
        title="Subir relatório do PDV"
        level={1}
      />

      <Card variant="creme">
        <p className="text-sm">
          Anexa o <strong>PDF do Fast Report</strong> (relatório de venda detalhada).
          O sistema:
        </p>
        <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-preto/80">
          <li>extrai cada venda com timestamp completo;</li>
          <li>agrega por dia / forma de pagamento;</li>
          <li>baixa o estoque de pizza pronta (quando ficha técnica existir);</li>
          <li>flagga produtos vendidos sem cadastro no catálogo.</li>
        </ul>
        <p className="text-xs text-preto/60 mt-3 font-[family-name:var(--font-mono)]">
          Idempotente — re-uploads do mesmo período não duplicam vendas.
        </p>
      </Card>

      <UploadForm />

      {uploads && uploads.length > 0 && (
        <section className="space-y-3">
          <EyebrowTitle eyebrow={`// ${uploads.length} UPLOAD(S)`} title="Histórico" level={3} />
          <Card>
            <ul className="divide-y divide-preto/10">
              {(uploads as Array<{ id: string; nome_original: string; data_upload: string; parsed: boolean; parsing_erro: string | null; tamanho_bytes: number | null }>).map((u) => (
                <li key={u.id} className="py-2 flex items-center gap-3 text-sm">
                  <FileText size={16} className="text-preto/40 shrink-0" />
                  <span className="truncate flex-1">{u.nome_original}</span>
                  <span className="text-xs font-[family-name:var(--font-mono)] text-preto/50">
                    {fmtDataBR(u.data_upload)}
                  </span>
                  {u.parsed ? (
                    <CheckCircle2 size={14} className="text-verde" />
                  ) : u.parsing_erro ? (
                    <span className="text-xs text-vermelho">erro</span>
                  ) : (
                    <span className="text-xs text-amarelo-escuro">pendente</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {vendas && vendas.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <EyebrowTitle eyebrow="// PRÉVIA" title="Últimos lançamentos" level={3} />
            <a href="/vendas/historico" className="text-sm font-[family-name:var(--font-subtitulo)] text-vermelho hover:underline">
              ver histórico completo com filtro →
            </a>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase border-b-2 border-preto">
                  <tr>
                    <th className="pb-2 pr-3">Data</th>
                    <th className="pb-2 pr-3 text-right">Vendas</th>
                    <th className="pb-2 pr-3 text-right">Faturamento</th>
                    <th className="pb-2 pr-3 text-right">PIX</th>
                    <th className="pb-2 pr-3 text-right">Débito</th>
                    <th className="pb-2 pr-3 text-right">Crédito</th>
                    <th className="pb-2 text-right">Dinheiro</th>
                  </tr>
                </thead>
                <tbody>
                  {(vendas as Array<{ data: string; qtd_vendas: number; faturamento_bruto: number; pagamento_pix: number; pagamento_cartao_debito: number; pagamento_cartao_credito: number; pagamento_dinheiro: number }>).map((v) => (
                    <tr key={v.data} className="border-b border-preto/5">
                      <td className="py-2 pr-3 font-[family-name:var(--font-mono)]">{fmtDataBR(v.data)}</td>
                      <td className="py-2 pr-3 text-right">{v.qtd_vendas}</td>
                      <td className="py-2 pr-3 text-right font-[family-name:var(--font-subtitulo)]">{fmtBR(v.faturamento_bruto)}</td>
                      <td className="py-2 pr-3 text-right text-preto/60">{fmtBR(v.pagamento_pix)}</td>
                      <td className="py-2 pr-3 text-right text-preto/60">{fmtBR(v.pagamento_cartao_debito)}</td>
                      <td className="py-2 pr-3 text-right text-preto/60">{fmtBR(v.pagamento_cartao_credito)}</td>
                      <td className="py-2 text-right text-preto/60">{fmtBR(v.pagamento_dinheiro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
