import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtDataBR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistoricoVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Range default: últimos 60 dias
  const hoje = new Date();
  const passado = new Date(); passado.setDate(passado.getDate() - 60);
  const de = sp.de ?? passado.toISOString().split("T")[0];
  const ate = sp.ate ?? hoje.toISOString().split("T")[0];

  const { data: dias } = await supabase
    .from("venda_diaria")
    .select("data, qtd_vendas, faturamento_bruto, pagamento_dinheiro, pagamento_pix, pagamento_cartao_credito, pagamento_cartao_debito")
    .gte("data", de)
    .lte("data", ate)
    .is("deleted_at", null)
    .order("data", { ascending: false });

  const lista = (dias ?? []) as Array<{ data: string; qtd_vendas: number; faturamento_bruto: number; pagamento_dinheiro: number; pagamento_pix: number; pagamento_cartao_credito: number; pagamento_cartao_debito: number }>;
  const total = lista.reduce((s, v) => s + Number(v.faturamento_bruto), 0);
  const totalVendas = lista.reduce((s, v) => s + v.qtd_vendas, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <EyebrowTitle eyebrow="// VENDAS" title="Histórico" level={1} />

      {/* Filtro */}
      <Card>
        <form className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="eyebrow block mb-1">De</label>
            <input type="date" name="de" defaultValue={de}
              className="px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Até</label>
            <input type="date" name="ate" defaultValue={ate}
              className="px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <button className="btn-bruto btn-vermelho" type="submit">filtrar</button>
          <div className="flex gap-1 ml-auto">
            <FiltroRapido label="Esse mês" tipo="mes" />
            <FiltroRapido label="Mês passado" tipo="mes-ant" />
            <FiltroRapido label="Últimos 60d" tipo="60d" />
            <FiltroRapido label="Tudo" tipo="tudo" />
          </div>
        </form>
      </Card>

      {/* Totais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><div className="eyebrow">Faturamento</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{fmtBR(total)}</div></Card>
        <Card><div className="eyebrow">Vendas</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{totalVendas}</div></Card>
        <Card><div className="eyebrow">Ticket médio</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{totalVendas > 0 ? fmtBR(total/totalVendas) : "—"}</div></Card>
        <Card><div className="eyebrow">Dias com venda</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{lista.length}</div></Card>
      </div>

      {/* Lista */}
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
            <tr>
              <th className="px-3 py-2 text-left w-24">Data</th>
              <th className="px-3 py-2 text-right w-20">Vendas</th>
              <th className="px-3 py-2 text-right w-28">Faturamento</th>
              <th className="px-3 py-2 text-right w-28">Ticket</th>
              <th className="px-3 py-2 text-right">PIX</th>
              <th className="px-3 py-2 text-right">Débito</th>
              <th className="px-3 py-2 text-right">Crédito</th>
              <th className="px-3 py-2 text-right">Dinheiro</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((v) => (
              <tr key={v.data} className="border-t border-preto/5 hover:bg-amarelo/10">
                <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-xs">{fmtDataBR(v.data)}</td>
                <td className="px-3 py-2 text-right">{v.qtd_vendas}</td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-subtitulo)]">{fmtBR(v.faturamento_bruto)}</td>
                <td className="px-3 py-2 text-right">{fmtBR(v.faturamento_bruto / v.qtd_vendas)}</td>
                <td className="px-3 py-2 text-right text-preto/60">{fmtBR(v.pagamento_pix)}</td>
                <td className="px-3 py-2 text-right text-preto/60">{fmtBR(v.pagamento_cartao_debito)}</td>
                <td className="px-3 py-2 text-right text-preto/60">{fmtBR(v.pagamento_cartao_credito)}</td>
                <td className="px-3 py-2 text-right text-preto/60">{fmtBR(v.pagamento_dinheiro)}</td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-preto/50">Nenhuma venda no período.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function FiltroRapido({ label, tipo }: { label: string; tipo: string }) {
  const hoje = new Date();
  let de = "", ate = hoje.toISOString().split("T")[0];
  if (tipo === "mes") {
    de = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];
  } else if (tipo === "mes-ant") {
    de = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split("T")[0];
    ate = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split("T")[0];
  } else if (tipo === "60d") {
    const d = new Date(); d.setDate(d.getDate() - 60);
    de = d.toISOString().split("T")[0];
  } else {
    de = "2026-01-01";
  }
  return (
    <Link href={`/vendas/historico?de=${de}&ate=${ate}`}
      className="text-xs px-2 py-1.5 border-2 border-preto rounded bg-creme-claro hover:bg-amarelo font-[family-name:var(--font-subtitulo)]">
      {label}
    </Link>
  );
}
