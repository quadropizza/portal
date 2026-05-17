import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { PainelLacunas } from "@/components/painel-lacunas";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtPct, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const mesPtBR = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default async function VisaoGeralPage() {
  const supabase = await createClient();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  const mesAntAno = mes === 1 ? ano - 1 : ano;
  const mesAntMes = mes === 1 ? 12 : mes - 1;

  const [atual, anterior, planoRows, lacunasN] = await Promise.all([
    supabase.from("metricas_completas").select("*").eq("ano", ano).eq("mes", mes).maybeSingle(),
    supabase.from("metricas_completas").select("*").eq("ano", mesAntAno).eq("mes", mesAntMes).maybeSingle(),
    supabase.from("plano_acao_item").select("id, titulo, severidade, status, categoria_plano, prazo")
      .eq("ano", ano).eq("mes", mes).is("deleted_at", null).order("ordem").limit(6),
    supabase.from("painel_lacunas").select("tipo", { count: "exact", head: true }),
  ]);

  const a: any = atual.data ?? {};
  const p: any = anterior.data ?? null;
  const receitaA = Number(a.receita_bruta ?? 0);
  const receitaP = Number(p?.receita_bruta ?? 0);
  const lucroA = Number(a.lucro_socio_previsto ?? 0);
  const lucroP = Number(p?.lucro_socio_previsto ?? 0);

  const variacaoReceita = receitaP > 0 ? (receitaA - receitaP) / receitaP : null;

  const plano = (planoRows.data ?? []) as Array<{ id: string; titulo: string; severidade: string; status: string; categoria_plano: string }>;
  const urgentes = plano.filter((i) => i.severidade === "urgente" && i.status !== "concluido");
  const positivos = plano.filter((i) => i.severidade === "positivo");

  return (
    <div className="space-y-6 max-w-6xl">
      {/* HERO — mês corrente com lucro grande */}
      <header className="rounded-2xl border-3 border-preto bg-amarelo overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="eyebrow">// {mesPtBR[mes-1].toUpperCase()}/{ano} · MÊS CORRENTE</div>
              <h1 className="text-3xl md:text-5xl font-[family-name:var(--font-titulo)] leading-none mt-1">
                Como tá o caixa
              </h1>
            </div>
            <div className="text-right">
              <div className="text-xs font-[family-name:var(--font-mono)] text-preto/60">Hoje · {hoje.toLocaleDateString("pt-BR")}</div>
            </div>
          </div>

          {receitaA === 0 ? (
            <Card variant="creme" className="mt-6">
              <p className="text-sm">Sem dados de {mesPtBR[mes-1]} ainda. Suba o relatório do PDV em <Link href="/vendas/dia" className="underline font-bold">Vendas</Link>.</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <BigNumber
                  rotulo="Faturamento até hoje"
                  valor={fmtBR(receitaA)}
                  comparacao={variacaoReceita}
                  comparacaoLabel="vs mês anterior"
                />
                <BigNumber
                  rotulo="Pendências críticas"
                  valor={String(urgentes.length)}
                  hint={urgentes.length > 0 ? "ações urgentes no plano" : "tudo sob controle"}
                  negativo={urgentes.length > 0}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <LucroMini
                  rotulo="Lucro BRUTO"
                  valor={Number(a.receita_bruta ?? 0) - Math.abs(Number(a.cmv ?? 0))}
                  pctReceita={receitaA > 0 ? (Number(a.receita_bruta ?? 0) - Math.abs(Number(a.cmv ?? 0))) / receitaA : 0}
                  hint="receita − CMV"
                />
                <LucroMini
                  rotulo="Lucro OPERACIONAL"
                  valor={Number(a.lucro_operacional ?? 0)}
                  pctReceita={Number(a.margem_operacional ?? 0)}
                  hint="− despesas op."
                />
                <LucroMini
                  rotulo="Lucro LÍQUIDO previsto"
                  valor={lucroA}
                  pctReceita={receitaA > 0 ? lucroA / receitaA : 0}
                  hint="− pró-labore, impostos prev."
                />
              </div>
            </>
          )}
        </div>
        {p && (
          <div className="bg-preto text-creme px-6 md:px-8 py-3 flex items-center justify-between text-sm flex-wrap gap-2">
            <span className="font-[family-name:var(--font-mono)]">
              📊 {mesPtBR[mesAntMes-1]} fechou: receita {fmtBR(receitaP)} · lucro {fmtBR(lucroP)}
            </span>
            <Link href="/dre" className="text-amarelo hover:underline font-[family-name:var(--font-subtitulo)] text-xs">
              ver DRE completa →
            </Link>
          </div>
        )}
      </header>

      {/* DIAGNÓSTICO RÁPIDO */}
      {receitaA > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard
            titulo="CMV"
            valor={fmtPct(a.cmv_pct ?? 0)}
            metaTxt="meta ≤ 35%"
            ok={(a.cmv_pct ?? 0) <= 0.35}
            descricao={(a.cmv_pct ?? 0) > 0.35
              ? "Acima da meta · revisar fornecedores e gramatura"
              : "Dentro do saudável"}
          />
          <StatusCard
            titulo="Retirada sócios"
            valor={fmtPct(a.pro_labore_pct ?? 0)}
            metaTxt="meta ≤ 25%"
            ok={(a.pro_labore_pct ?? 0) <= 0.25}
            descricao={(a.pro_labore_pct ?? 0) > 0.25
              ? "Acima do saudável · segurar retirada"
              : "Dentro do limite"}
          />
          <StatusCard
            titulo="Ticket médio"
            valor={fmtBR(a.ticket_medio ?? 0)}
            metaTxt={`meta ≥ ${fmtBR(a.meta_ticket ?? 28)}`}
            ok={(a.ticket_medio ?? 0) >= (a.meta_ticket ?? 28)}
            descricao={(a.ticket_medio ?? 0) >= (a.meta_ticket ?? 28)
              ? "Boa média por venda"
              : `Cada R$ 1 = +${fmtBR((a.qtd_vendas ?? 0))}/mês`}
          />
        </section>
      )}

      {/* PRÓXIMAS AÇÕES */}
      {plano.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <EyebrowTitle eyebrow="// PRÓXIMAS AÇÕES" title="O que fazer agora" level={2} />
            <Link href="/plano-de-acao" className="text-sm font-[family-name:var(--font-subtitulo)] text-vermelho hover:underline">
              ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plano.slice(0, 4).map((it) => <ItemAcao key={it.id} item={it} />)}
          </div>
        </section>
      )}

      {/* INSIGHTS POSITIVOS */}
      {positivos.length > 0 && (
        <section>
          <Card variant="creme" className="border-verde border-[3px]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={18} className="text-verde" />
              <h3 className="font-[family-name:var(--font-subtitulo)] text-verde">Tá funcionando — manter</h3>
            </div>
            <ul className="text-sm space-y-1">
              {positivos.map((p) => <li key={p.id}>• {p.titulo}</li>)}
            </ul>
          </Card>
        </section>
      )}

      <PainelLacunas />
    </div>
  );
}

function LucroMini({ rotulo, valor, pctReceita, hint }: { rotulo: string; valor: number; pctReceita: number; hint?: string }) {
  return (
    <div className={cn("bg-white border-3 border-preto rounded-xl p-3 border-l-[6px]", valor >= 0 ? "border-l-verde" : "border-l-vermelho")}>
      <div className="eyebrow text-[10px]">{rotulo}</div>
      <div className={cn("text-xl font-[family-name:var(--font-titulo)] leading-none mt-1", valor < 0 && "text-vermelho")}>
        {fmtBR(valor)}
      </div>
      <div className="text-[11px] mt-1 font-[family-name:var(--font-mono)] text-preto/60">
        {fmtPct(pctReceita)} da receita
      </div>
      {hint && <div className="text-[9px] text-preto/40 mt-0.5">{hint}</div>}
    </div>
  );
}

function BigNumber({ rotulo, valor, hint, comparacao, comparacaoLabel, negativo }: {
  rotulo: string; valor: string; hint?: string;
  comparacao?: number | null; comparacaoLabel?: string; negativo?: boolean;
}) {
  return (
    <div className="bg-white border-3 border-preto rounded-xl p-4">
      <div className="eyebrow mb-1">{rotulo}</div>
      <div className={cn(
        "text-3xl md:text-4xl font-[family-name:var(--font-titulo)] leading-none",
        negativo && "text-vermelho",
      )}>
        {valor}
      </div>
      {comparacao != null && (
        <div className="flex items-center gap-1 mt-2 text-xs font-[family-name:var(--font-mono)]">
          {comparacao >= 0 ? (
            <span className="text-verde flex items-center gap-1">
              <TrendingUp size={12} /> +{(comparacao * 100).toFixed(1)}%
            </span>
          ) : (
            <span className="text-vermelho flex items-center gap-1">
              <TrendingDown size={12} /> {(comparacao * 100).toFixed(1)}%
            </span>
          )}
          <span className="text-preto/50">{comparacaoLabel}</span>
        </div>
      )}
      {hint && !comparacao && (
        <div className="text-xs mt-2 text-preto/60 font-[family-name:var(--font-mono)]">{hint}</div>
      )}
    </div>
  );
}

function StatusCard({ titulo, valor, metaTxt, descricao, ok }: {
  titulo: string; valor: string; metaTxt: string; descricao: string; ok: boolean;
}) {
  return (
    <div className={cn(
      "card-bruto border-l-[6px]",
      ok ? "border-l-verde" : "border-l-vermelho",
    )}>
      <div className="flex items-center justify-between mb-1">
        <div className="eyebrow">{titulo}</div>
        {ok
          ? <CheckCircle2 size={16} className="text-verde" />
          : <AlertCircle size={16} className="text-vermelho" />}
      </div>
      <div className="text-2xl font-[family-name:var(--font-titulo)] leading-tight">{valor}</div>
      <div className="text-[11px] font-[family-name:var(--font-mono)] text-preto/50 mt-1">{metaTxt}</div>
      <div className="text-xs mt-2 text-preto/80">{descricao}</div>
    </div>
  );
}

function ItemAcao({ item }: { item: { id: string; titulo: string; severidade: string; status: string } }) {
  const cor = item.severidade === "urgente" ? "border-l-vermelho bg-vermelho/5"
            : item.severidade === "medio"   ? "border-l-amarelo-escuro bg-amarelo/10"
            : item.severidade === "positivo" ? "border-l-verde bg-verde/5"
            : "border-l-preto/30";
  return (
    <Link href="/plano-de-acao" className={cn("card-bruto border-l-[6px] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1A1410] transition-transform flex items-start justify-between gap-3", cor)}>
      <span className="text-sm font-[family-name:var(--font-subtitulo)] leading-tight">{item.titulo}</span>
      <ArrowRight size={16} className="shrink-0 mt-0.5 text-preto/40" />
    </Link>
  );
}
