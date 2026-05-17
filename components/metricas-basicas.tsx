import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { fmtBR, fmtPct, cn } from "@/lib/utils";

type Status = "alto" | "medio" | "saudavel" | "neutro";

const corPorStatus: Record<Status, string> = {
  alto:     "bg-vermelho text-white",
  medio:    "bg-amarelo text-preto",
  saudavel: "bg-verde text-white",
  neutro:   "bg-creme-claro text-preto",
};

const rotuloStatus: Record<Status, string> = {
  alto: "ALTO", medio: "ATENÇÃO", saudavel: "SAUDÁVEL", neutro: "—",
};

function Badge({ status }: { status: Status }) {
  return (
    <span className={cn(
      "inline-block text-[10px] font-[family-name:var(--font-mono)] px-2 py-0.5 border-2 border-preto rounded font-bold tracking-wider",
      corPorStatus[status],
    )}>
      {rotuloStatus[status]}
    </span>
  );
}

function Metrica({
  rotulo, valor, hint, status,
}: { rotulo: string; valor: string; hint?: string; status: Status }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="eyebrow">{rotulo}</div>
        <Badge status={status} />
      </div>
      <div className="text-3xl font-[family-name:var(--font-titulo)] leading-none">{valor}</div>
      {hint && (
        <div className="text-xs mt-2 text-preto/60 font-[family-name:var(--font-mono)]">{hint}</div>
      )}
    </Card>
  );
}

/**
 * Lê metricas_mensais e renderiza grid de KPIs do mês com classificação
 * automática alto/médio/saudável conforme metas em empresa.metas.
 */
export async function MetricasBasicas({ ano, mes }: { ano: number; mes: number }) {
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("metricas_mensais")
    .select("*")
    .eq("ano", ano)
    .eq("mes", mes)
    .maybeSingle();

  if (!m) return null;
  const r = m as Record<string, number | null>;

  const receita        = r.receita_bruta ?? 0;
  const qtdVendas      = r.qtd_vendas ?? 0;
  const dias           = r.dias_operados ?? 0;
  const ticket         = r.ticket_medio ?? 0;
  const cmvPct         = r.cmv_pct ?? 0;
  const cmoPct         = r.cmo_pct ?? 0;
  const despesasPct    = r.despesas_op_pct ?? 0;
  const retiradaPct    = r.pro_labore_pct ?? 0;
  const margemOp       = r.margem_operacional ?? 0;
  const margemLiquida  = r.margem_liquida ?? 0;
  const metaCmv        = r.meta_cmv ?? 0.35;
  const metaRetirada   = r.meta_retirada ?? 0.25;
  const metaTicket     = r.meta_ticket ?? 28;

  // Classificações
  const statusCMV: Status =
    cmvPct === 0 ? "neutro" :
    cmvPct > 0.40 ? "alto" :
    cmvPct > metaCmv ? "medio" : "saudavel";

  const statusCMO: Status =
    cmoPct === 0 ? "neutro" :
    cmoPct > 0.20 ? "alto" :
    cmoPct > 0.15 ? "medio" : "saudavel";

  const statusDespesas: Status =
    despesasPct === 0 ? "neutro" :
    despesasPct > 0.85 ? "alto" :
    despesasPct > 0.70 ? "medio" : "saudavel";

  const statusRetirada: Status =
    retiradaPct === 0 ? "neutro" :
    retiradaPct > 0.35 ? "alto" :
    retiradaPct > metaRetirada ? "medio" : "saudavel";

  const statusTicket: Status =
    ticket === 0 ? "neutro" :
    ticket < metaTicket * 0.85 ? "alto" :
    ticket < metaTicket ? "medio" : "saudavel";

  const diasUteisMes = new Date(ano, mes, 0).getDate();
  const pctDias = diasUteisMes > 0 ? dias / diasUteisMes : 0;
  const statusDias: Status =
    dias === 0 ? "neutro" :
    pctDias < 0.55 ? "alto" :
    pctDias < 0.70 ? "medio" : "saudavel";

  const statusMargem: Status =
    margemLiquida === 0 ? "neutro" :
    margemLiquida < 0 ? "alto" :
    margemLiquida < 0.10 ? "medio" : "saudavel";

  if (receita === 0) return null;

  return (
    <section className="space-y-4">
      <EyebrowTitle eyebrow="// DADOS BÁSICOS DO MÊS" title="Como tá indo" level={2} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Metrica
          rotulo="CMV"
          valor={fmtPct(cmvPct)}
          hint={`${fmtBR(r.cmv ?? 0)} · meta ${fmtPct(metaCmv)}`}
          status={statusCMV}
        />
        <Metrica
          rotulo="CMO · Folha"
          valor={fmtPct(cmoPct)}
          hint={`${fmtBR(r.cmo ?? 0)} · folha + encargos`}
          status={statusCMO}
        />
        <Metrica
          rotulo="Despesas op."
          valor={fmtPct(despesasPct)}
          hint={`${fmtBR(r.despesas_operacionais ?? 0)} · tudo exceto pró-labore`}
          status={statusDespesas}
        />
        <Metrica
          rotulo="Retirada sócios"
          valor={fmtPct(retiradaPct)}
          hint={`${fmtBR(r.pro_labore_total ?? 0)} · meta ${fmtPct(metaRetirada)}`}
          status={statusRetirada}
        />
        <Metrica
          rotulo="Ticket médio"
          valor={fmtBR(ticket)}
          hint={`meta ${fmtBR(metaTicket)} · ${qtdVendas} vendas`}
          status={statusTicket}
        />
        <Metrica
          rotulo="Dias operados"
          valor={`${dias} / ${diasUteisMes}`}
          hint={`${fmtPct(pctDias)} dos dias do mês`}
          status={statusDias}
        />
        <Metrica
          rotulo="Margem operacional"
          valor={fmtPct(margemOp)}
          hint="antes do pró-labore"
          status={margemOp < 0 ? "alto" : margemOp < 0.10 ? "medio" : "saudavel"}
        />
        <Metrica
          rotulo="Margem líquida"
          valor={fmtPct(margemLiquida)}
          hint="depois do pró-labore"
          status={statusMargem}
        />
      </div>
    </section>
  );
}
