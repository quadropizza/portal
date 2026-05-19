import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtDataBR } from "@/lib/utils";
import { Plus, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FiadosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fiado")
    .select("id, nome_cliente, telefone, status, data_abertura, data_fechamento, total")
    .is("deleted_at", null)
    .order("data_abertura", { ascending: false })
    .limit(50);

  const lista = (data ?? []) as any[];
  const abertos = lista.filter((f) => f.status === "aberto");
  const totalAberto = abertos.reduce((s, f) => s + Number(f.total), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <EyebrowTitle eyebrow={`// ${abertos.length} ABERTAS`} title="Fiados / Comandas" level={1} />
        <Link href="/fiados/novo"><Button variant="vermelho"><Plus size={16} /> Nova comanda</Button></Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card><div className="eyebrow text-[10px] sm:text-xs">Em aberto</div><div className="text-lg sm:text-2xl font-[family-name:var(--font-titulo)] text-vermelho">{fmtBR(totalAberto)}</div></Card>
        <Card><div className="eyebrow text-[10px] sm:text-xs">Abertas</div><div className="text-lg sm:text-2xl font-[family-name:var(--font-titulo)]">{abertos.length}</div></Card>
        <Card><div className="eyebrow text-[10px] sm:text-xs">Histórico</div><div className="text-lg sm:text-2xl font-[family-name:var(--font-titulo)]">{lista.length}</div></Card>
      </div>

      {/* Mobile: lista de cards · Desktop: tabela */}
      <div className="space-y-2 sm:hidden">
        {lista.length === 0 && <Card><div className="text-center text-preto/50 py-4">Nenhuma comanda.</div></Card>}
        {lista.map((f) => (
          <Link key={f.id} href={`/fiados/${f.id}`} className="block">
            <Card className="active:bg-amarelo/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-[family-name:var(--font-subtitulo)] truncate">{f.nome_cliente}</div>
                  <div className="text-[11px] text-preto/60 font-[family-name:var(--font-mono)] mt-0.5">
                    {fmtDataBR(f.data_abertura)}
                    {f.telefone && ` · ${f.telefone}`}
                  </div>
                  <div className="text-[11px] mt-1">
                    {f.status === "aberto" && <span className="text-amarelo-escuro">⏱ aberta</span>}
                    {f.status === "fechado" && <span className="text-laranja">📤 fechada</span>}
                    {f.status === "pago" && <span className="text-verde">✓ paga</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-[family-name:var(--font-titulo)] text-vermelho text-lg">{fmtBR(f.total)}</div>
                </div>
                <ChevronRight size={18} className="text-preto/40 shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-0 overflow-hidden hidden sm:block">
        <table className="w-full text-sm">
          <thead className="text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
            <tr>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Telefone</th>
              <th className="px-3 py-2 text-left w-24">Aberta em</th>
              <th className="px-3 py-2 text-right w-28">Total</th>
              <th className="px-3 py-2 text-center w-20">Status</th>
              <th className="px-3 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} className="border-t border-preto/5 hover:bg-amarelo/10">
                <td className="px-3 py-2 font-[family-name:var(--font-subtitulo)]">{f.nome_cliente}</td>
                <td className="px-3 py-2 text-xs text-preto/60 font-[family-name:var(--font-mono)]">{f.telefone ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{fmtDataBR(f.data_abertura)}</td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-subtitulo)]">{fmtBR(f.total)}</td>
                <td className="px-3 py-2 text-center text-xs">
                  {f.status === "aberto" && <span className="text-amarelo-escuro">aberta</span>}
                  {f.status === "fechado" && <span className="text-laranja">fechada</span>}
                  {f.status === "pago" && <span className="text-verde">paga</span>}
                </td>
                <td className="px-3 py-2"><Link href={`/fiados/${f.id}`} className="text-xs text-vermelho hover:underline">abrir</Link></td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-preto/50">Nenhuma comanda aberta.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
