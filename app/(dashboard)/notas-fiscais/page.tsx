import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtDataBR } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { UploadNfe } from "./upload-nfe";

export const dynamic = "force-dynamic";

const rotuloTipo: Record<string, string> = {
  nf_fornecedor: "NF fornecedor",
  boleto_avulso: "Boleto",
  tributo: "Tributo",
  encargo_trabalhista: "Encargo",
};

export default async function NotasPage() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("obrigacao_a_pagar")
    .select("id, tipo, numero, data_vencimento, valor_total, valor_pago, status, fornecedor:fornecedor(apelido,nome)")
    .is("deleted_at", null)
    .order("data_vencimento");
  const lista = (data ?? []) as any[];

  const aberto = lista.filter((o) => o.status === "em_aberto");
  const vencidos = aberto.filter((o) => o.data_vencimento < hoje);
  const totalAberto = aberto.reduce((s, o) => s + (Number(o.valor_total) - Number(o.valor_pago)), 0);

  return (
    <div className="space-y-8 max-w-5xl">
      <EyebrowTitle eyebrow="// CONTAS A PAGAR" title="Notas / Boletos / Tributos" level={1} />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><div className="eyebrow mb-1">Em aberto</div><div className="text-2xl font-[family-name:var(--font-titulo)] text-vermelho">{fmtBR(totalAberto)}</div></Card>
        <Card><div className="eyebrow mb-1">Vencidas</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{vencidos.length}</div></Card>
        <Card><div className="eyebrow mb-1">Total em aberto</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{aberto.length}</div></Card>
        <Card><div className="eyebrow mb-1">Total registradas</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{lista.length}</div></Card>
      </section>

      <Card variant="creme">
        <p className="text-sm">
          Anexa o <strong>XML da NF-e</strong> (preferencial — vem por email do fornecedor) ou
          PDF/foto de boleto avulso, DARF, GFD-FGTS. O sistema parseia, cadastra fornecedor
          se for novo, e fica esperando o pagamento aparecer no extrato pra conciliar.
        </p>
      </Card>

      <UploadNfe />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <EyebrowTitle eyebrow={`// ${lista.length} TOTAL`} title="Histórico" level={3} />
          <Link href="/notas-fiscais/nova"><Button variant="vermelho"><Plus size={14} /> Manual</Button></Link>
        </div>
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
              <tr>
                <th className="px-3 py-2 text-left w-28">Vencimento</th>
                <th className="px-3 py-2 text-left">Fornecedor / Doc</th>
                <th className="px-3 py-2 text-left w-32">Tipo</th>
                <th className="px-3 py-2 text-right w-28">Valor</th>
                <th className="px-3 py-2 text-center w-28">Status</th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => {
                const restante = Number(o.valor_total) - Number(o.valor_pago);
                const vencido = o.status === "em_aberto" && o.data_vencimento < hoje;
                return (
                  <tr key={o.id} className={`border-t border-preto/5 ${vencido ? "bg-vermelho/5" : ""}`}>
                    <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-xs">
                      {vencido && <AlertTriangle size={12} className="inline text-vermelho mr-1" />}
                      {fmtDataBR(o.data_vencimento)}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <div className="font-[family-name:var(--font-subtitulo)]">{o.fornecedor?.apelido ?? o.fornecedor?.nome ?? "—"}</div>
                      {o.numero && <div className="text-xs text-preto/50">nº {o.numero}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-preto/60">{rotuloTipo[o.tipo] ?? o.tipo}</td>
                    <td className="px-3 py-2 text-right font-[family-name:var(--font-subtitulo)]">{fmtBR(restante)}</td>
                    <td className="px-3 py-2 text-center text-xs">
                      {o.status === "pago" && <span className="text-verde flex items-center justify-center gap-1"><CheckCircle2 size={12} /> pago</span>}
                      {o.status === "em_aberto" && (vencido ? <span className="text-vermelho">vencido</span> : <span className="text-amarelo-escuro">em aberto</span>)}
                      {o.status === "parcialmente_pago" && <span className="text-amarelo-escuro">parcial</span>}
                    </td>
                    <td className="px-3 py-2"><Link href={`/notas-fiscais/${o.id}`} className="text-xs text-vermelho hover:underline">ver</Link></td>
                  </tr>
                );
              })}
              {lista.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-preto/50 text-sm">Nenhuma NF cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
