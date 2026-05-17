import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fmtBR } from "@/lib/utils";
import { GraficoDiario, GraficoDiaSemana, GraficoHora, GraficoPagamento, GraficoProdutos } from "./graficos";

export const dynamic = "force-dynamic";

const mesPtBR = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default async function VendasDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const hoje = new Date();
  const ano = sp.ano ? Number(sp.ano) : hoje.getFullYear();
  const mes = sp.mes ? Number(sp.mes) : hoje.getMonth() + 1;

  const supabase = await createClient();

  // Lê todas as views em paralelo
  const [diaR, dowR, horaR, pagR, prodR] = await Promise.all([
    supabase.from("vendas_por_dia")
      .select("data, qtd_vendas, faturamento, ticket_medio")
      .gte("data", `${ano}-${String(mes).padStart(2,"0")}-01`)
      .lt("data", `${ano}-${String(mes+1).padStart(2,"0")}-01`)
      .order("data"),
    supabase.from("vendas_por_dia_semana")
      .select("dow, dias_operados, qtd_vendas, faturamento, media_fat_por_dia, ticket_medio")
      .eq("ano", ano).eq("mes", mes).order("dow"),
    supabase.from("vendas_por_hora")
      .select("hora, qtd_vendas, faturamento")
      .eq("ano", ano).eq("mes", mes).order("hora"),
    supabase.from("vendas_por_pagamento")
      .select("forma, qtd_vendas, faturamento")
      .eq("ano", ano).eq("mes", mes),
    supabase.from("vendas_por_produto")
      .select("produto_codigo_origem, nome, categoria, qtd_total, fat_total")
      .eq("ano", ano).eq("mes", mes)
      .order("fat_total", { ascending: false })
      .limit(15),
  ]);

  const diario = (diaR.data ?? []) as Array<{ data: string; qtd_vendas: number; faturamento: number; ticket_medio: number }>;
  const porDow = (dowR.data ?? []) as Array<{ dow: number; dias_operados: number; faturamento: number; media_fat_por_dia: number }>;
  const porHora = (horaR.data ?? []) as Array<{ hora: number; qtd_vendas: number; faturamento: number }>;
  const porPag = (pagR.data ?? []) as Array<{ forma: string; faturamento: number }>;
  const porProd = (prodR.data ?? []) as Array<{ produto_codigo_origem: string; nome: string; categoria: string | null; qtd_total: number; fat_total: number }>;

  const faturamentoMes = diario.reduce((s, d) => s + d.faturamento, 0);
  const vendasMes = diario.reduce((s, d) => s + d.qtd_vendas, 0);
  const ticketMes = vendasMes > 0 ? faturamentoMes / vendasMes : 0;

  // pico = hora com maior fat
  const horaPico = porHora.reduce((max, h) => (h.faturamento > (max?.faturamento ?? 0) ? h : max), porHora[0]);
  const pctPico = faturamentoMes > 0 && horaPico ? horaPico.faturamento / faturamentoMes : 0;

  return (
    <div className="space-y-8 max-w-7xl">
      <EyebrowTitle
        eyebrow={`// ${mesPtBR[mes-1].toUpperCase()} ${ano}`}
        title="Dashboard de vendas"
        level={1}
      />

      {diario.length === 0 ? (
        <Card variant="amarelo">
          <p className="text-sm">
            Nenhuma venda registrada em {mesPtBR[mes-1]}/{ano}. Suba o PDF do Fast Report em
            <strong> Vendas → Subir relatório do PDV</strong>.
          </p>
        </Card>
      ) : (
        <>
          {/* Topline */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><div className="eyebrow mb-1">Faturamento</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{fmtBR(faturamentoMes)}</div></Card>
            <Card><div className="eyebrow mb-1">Vendas</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{vendasMes}</div></Card>
            <Card><div className="eyebrow mb-1">Ticket médio</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{fmtBR(ticketMes)}</div></Card>
            <Card><div className="eyebrow mb-1">Dias operados</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{diario.length}</div></Card>
          </section>

          {/* Faturamento diário */}
          <section>
            <div className="eyebrow mb-2">// EVOLUÇÃO DIÁRIA</div>
            <Card>
              <GraficoDiario data={diario} />
            </Card>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dia da semana */}
            <section>
              <div className="eyebrow mb-2">// MÉDIA POR DIA DA SEMANA</div>
              <Card>
                <GraficoDiaSemana data={porDow} />
              </Card>
            </section>

            {/* Hora — pico */}
            <section>
              <div className="eyebrow mb-2">
                // POR HORÁRIO {horaPico && pctPico > 0.20 && (
                  <span className="text-vermelho ml-2">
                    🔥 PICO {horaPico.hora}h ({(pctPico*100).toFixed(0)}%)
                  </span>
                )}
              </div>
              <Card>
                <GraficoHora data={porHora} />
              </Card>
            </section>

            {/* Forma de pagamento */}
            <section>
              <div className="eyebrow mb-2">// FORMA DE PAGAMENTO</div>
              <Card>
                <GraficoPagamento data={porPag} />
              </Card>
            </section>

            {/* Top produtos */}
            <section>
              <div className="eyebrow mb-2">// TOP 15 PRODUTOS</div>
              <Card>
                <GraficoProdutos data={porProd} />
              </Card>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
