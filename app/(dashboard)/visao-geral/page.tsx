import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card, StatCard } from "@/components/ui/card";
import { PainelLacunas } from "@/components/painel-lacunas";
import { MetricasBasicas } from "@/components/metricas-basicas";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtPct } from "@/lib/utils";
import { CheckCircle2, Circle, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

const mesPtBR = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export default async function VisaoGeralPage() {
  const supabase = await createClient();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;

  // Métricas completas (lucro previsto considerando impostos+bancárias do histórico)
  const { data: dre } = await supabase
    .from("metricas_completas")
    .select("*")
    .eq("ano", ano)
    .eq("mes", mes)
    .maybeSingle();

  const d = (dre ?? {}) as Record<string, number | undefined>;
  const receita = d.receita_bruta ?? 0;
  const cmv = d.cmv ?? 0;
  const cmvPct = receita > 0 ? Math.abs(cmv) / receita : 0;
  const lucroOp = d.lucro_operacional ?? 0;
  const lucroOpPrevisto = d.lucro_operacional_previsto ?? lucroOp;
  const lucroSocio = d.lucro_socio ?? 0;
  const lucroSocioPrevisto = d.lucro_socio_previsto ?? lucroSocio;

  // Plano de ação resumo
  const { data: planoRows } = await supabase
    .from("plano_acao_item")
    .select("id, titulo, severidade, status, categoria_plano, prazo")
    .eq("ano", ano)
    .eq("mes", mes)
    .is("deleted_at", null)
    .order("ordem")
    .limit(20);

  const plano = (planoRows ?? []) as Array<{
    id: string; titulo: string;
    severidade: "urgente" | "medio" | "controle" | "positivo";
    status: string; categoria_plano: string; prazo: string | null;
  }>;

  const insights = plano.filter((p) => p.categoria_plano !== "organizacao");
  const checklist = plano.filter((p) => p.categoria_plano === "organizacao");
  const concluidos = plano.filter((p) => p.status === "concluido").length;

  return (
    <div className="space-y-10 max-w-7xl">
      <EyebrowTitle
        eyebrow={`// ${mesPtBR[mes - 1].toUpperCase()} ${ano}`}
        title="Visão geral"
        level={1}
      />

      {receita === 0 ? (
        <Card variant="amarelo">
          <div className="font-[family-name:var(--font-subtitulo)] text-lg mb-2">
            🍕 Tá faltando alimentar o mês
          </div>
          <p className="text-sm">
            Sem dados de venda nem despesa pra {mesPtBR[mes - 1]}/{ano} ainda.
            Comece anexando o PDF do Fast Report em <strong>Vendas → Dia</strong> ou
            o PDF do extrato em <strong>Financeiro → Saídas</strong>.
          </p>
        </Card>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Faturamento" valor={fmtBR(receita)} />
          <StatCard
            label="CMV"
            valor={fmtBR(Math.abs(cmv))}
            hint={`${fmtPct(cmvPct)} da receita`}
            destaque={cmvPct > 0.35 ? "vermelho" : "verde"}
          />
          <StatCard
            label="Lucro op. previsto"
            valor={fmtBR(lucroOpPrevisto)}
            hint="já desc. impostos+banco prev."
            destaque={lucroOpPrevisto >= 0 ? "verde" : "vermelho"}
          />
          <StatCard
            label="Lucro do sócio prev."
            valor={fmtBR(lucroSocioPrevisto)}
            hint="depois do pró-labore"
            destaque={lucroSocioPrevisto >= 0 ? "verde" : "vermelho"}
          />
        </section>
      )}

      <MetricasBasicas ano={ano} mes={mes} />

      <PainelLacunas />

      {/* Plano de ação do mês */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <EyebrowTitle
            eyebrow={`// ${concluidos}/${plano.length} CONCLUÍDOS`}
            title="Plano do mês"
            level={2}
          />
          <Link href="/plano-de-acao" className="text-sm font-[family-name:var(--font-subtitulo)] hover:text-vermelho">
            Ver tudo →
          </Link>
        </div>

        {plano.length === 0 && (
          <Card variant="creme">
            <p className="text-sm">
              Plano do mês ainda não foi gerado. Ele é criado automaticamente
              no dia 1 a partir do fechamento do mês anterior (decisão §7.17).
              <Link href="/plano-de-acao" className="ml-2 underline font-[family-name:var(--font-subtitulo)]">
                Gerar agora →
              </Link>
            </p>
          </Card>
        )}

        {insights.length > 0 && (
          <div>
            <div className="eyebrow mb-2">// Insights do fechamento anterior</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.slice(0, 4).map((p) => <ItemPlano key={p.id} p={p} />)}
            </div>
          </div>
        )}

        {checklist.length > 0 && (
          <div>
            <div className="eyebrow mb-2">// Checklist de organização particular</div>
            <Card>
              <ul className="divide-y divide-preto/10">
                {checklist.slice(0, 6).map((p) => (
                  <li key={p.id} className="py-2 flex items-center gap-3 text-sm">
                    {p.status === "concluido"
                      ? <CheckCircle2 size={16} className="text-verde shrink-0" />
                      : <Circle size={16} className="text-preto/30 shrink-0" />}
                    <span className={p.status === "concluido" ? "line-through text-preto/50" : ""}>
                      {p.titulo}
                    </span>
                    {p.prazo && (
                      <span className="ml-auto text-xs font-[family-name:var(--font-mono)] text-preto/50">
                        até {new Date(p.prazo).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {checklist.length > 6 && (
                <Link href="/plano-de-acao" className="block mt-3 text-xs font-[family-name:var(--font-subtitulo)] text-vermelho hover:underline">
                  + {checklist.length - 6} item(ns) na lista completa →
                </Link>
              )}
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}

function ItemPlano({ p }: { p: { id: string; titulo: string; severidade: string } }) {
  const cor = p.severidade === "urgente" ? "bg-vermelho text-white"
            : p.severidade === "medio"   ? "bg-amarelo"
            : p.severidade === "positivo" ? "bg-verde text-white"
            : "bg-creme-claro";
  return (
    <Link href="/plano-de-acao" className={`card-bruto ${cor} block hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1A1410] transition-transform`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-[family-name:var(--font-subtitulo)] text-sm leading-tight">{p.titulo}</div>
        <ArrowUpRight size={16} className="shrink-0 opacity-60" />
      </div>
    </Link>
  );
}
