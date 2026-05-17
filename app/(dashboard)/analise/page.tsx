import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtPct, cn } from "@/lib/utils";
import { GraficosAnalise } from "./graficos";

export const dynamic = "force-dynamic";

const mesPtBR = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default async function AnalisePage({ searchParams }: { searchParams: Promise<{ ano?: string; mes?: string }> }) {
  const sp = await searchParams;
  const hoje = new Date();
  const ano = sp.ano ? Number(sp.ano) : hoje.getFullYear();
  const mes = sp.mes ? Number(sp.mes) : hoje.getMonth() + 1;

  const supabase = await createClient();
  const [metricsR, prodR, horaR, dowR, dreHistR] = await Promise.all([
    supabase.from("metricas_completas").select("*").eq("ano", ano).eq("mes", mes).maybeSingle(),
    supabase.from("vendas_por_produto").select("*").eq("ano", ano).eq("mes", mes).order("fat_total", { ascending: false }),
    supabase.from("vendas_por_hora").select("*").eq("ano", ano).eq("mes", mes).order("hora"),
    supabase.from("vendas_por_dia_semana").select("*").eq("ano", ano).eq("mes", mes).order("dow"),
    supabase.from("dre_mensal").select("*").order("ano").order("mes"),
  ]);

  const m: any = metricsR.data ?? {};
  const produtos = (prodR.data ?? []) as any[];
  const horas = (horaR.data ?? []) as any[];
  const dow = (dowR.data ?? []) as any[];
  const dreHist = (dreHistR.data ?? []) as any[];

  const receita = Number(m.receita_bruta ?? 0);

  // ABC (Pareto) — produtos que fazem 80% do faturamento
  const totalProd = produtos.reduce((s, p) => s + Number(p.fat_total), 0);
  let acumA = 0, abcA: any[] = [], abcB: any[] = [], abcC: any[] = [];
  for (const p of produtos) {
    const pct = Number(p.fat_total) / totalProd;
    if (acumA < 0.80) { abcA.push(p); acumA += pct; }
    else if (acumA < 0.95) { abcB.push(p); acumA += pct; }
    else { abcC.push(p); }
  }

  // RPMxV — receita por hora trabalhada (proxy: 8h/dia operado)
  const horasMedias = 8;
  const diasOp = Number(m.dias_operados ?? 0);
  const rphV = receita / Math.max(1, diasOp * horasMedias);

  // Pico
  const picoHora = horas.reduce((max, h) => Number(h.faturamento) > Number(max?.faturamento ?? 0) ? h : max, horas[0]);
  const pctPico = picoHora && receita > 0 ? Number(picoHora.faturamento) / receita : 0;

  // Concentração top 3
  const top3Fat = produtos.slice(0, 3).reduce((s, p) => s + Number(p.fat_total), 0);
  const conc3 = totalProd > 0 ? top3Fat / totalProd : 0;

  // Volume médio dia mais forte vs mais fraco
  const dowFat = dow.map((d) => Number(d.media_fat_por_dia));
  const maxDow = Math.max(...dowFat, 0);
  const minDow = Math.min(...dowFat.filter((x) => x > 0), maxDow);
  const dispersao = maxDow > 0 ? (maxDow - minDow) / maxDow : 0;

  // Sazonalidade vs Univali (mar-jun, ago-nov é forte; jan-fev, jul é fraco)
  const sazonalForte = [3, 4, 5, 6, 8, 9, 10, 11].includes(mes);

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <EyebrowTitle eyebrow={`// ${mesPtBR[mes-1].toUpperCase()} ${ano}`} title="Análise do negócio" level={1} />
        <SeletorMes ano={ano} mes={mes} />
      </div>

      {receita === 0 ? (
        <Card variant="amarelo"><p className="text-sm">Sem dados em {mesPtBR[mes-1]}/{ano}.</p></Card>
      ) : (
        <>
          {/* MÉTRICAS-CHAVE DE GESTÃO DE RESTAURANTE */}
          <section>
            <EyebrowTitle eyebrow="// O QUE OBSERVAR" title="Indicadores-chave" level={2} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              <Kpi
                titulo="Receita por hora aberta"
                valor={fmtBR(rphV)}
                bench="Pizzaria saudável: R$ 150-300/h"
                ok={rphV >= 150}
              />
              <Kpi
                titulo="Ticket médio"
                valor={fmtBR(m.ticket_medio ?? 0)}
                bench={`Meta: ≥ ${fmtBR(m.meta_ticket ?? 28)}`}
                ok={(m.ticket_medio ?? 0) >= (m.meta_ticket ?? 28)}
              />
              <Kpi
                titulo="CMV"
                valor={fmtPct(m.cmv_pct ?? 0)}
                bench="Pizzaria: 30-35% saudável"
                ok={(m.cmv_pct ?? 0) <= 0.35}
              />
              <Kpi
                titulo="Margem operacional"
                valor={fmtPct(m.margem_operacional ?? 0)}
                bench="Saudável: ≥ 15%"
                ok={(m.margem_operacional ?? 0) >= 0.10}
              />
              <Kpi
                titulo="Concentração top 3 produtos"
                valor={fmtPct(conc3)}
                bench="Saudável: ≤ 70%"
                ok={conc3 <= 0.70}
              />
              <Kpi
                titulo="Dispersão dia mais forte vs fraco"
                valor={fmtPct(dispersao)}
                bench="Equilíbrio = abaixo de 50%"
                ok={dispersao <= 0.50}
              />
              <Kpi
                titulo="Pico de horário concentra"
                valor={fmtPct(pctPico)}
                bench={`${picoHora?.hora ?? "?"}h · saudável ≤ 30%`}
                ok={pctPico <= 0.30}
              />
              <Kpi
                titulo="Pró-labore consome"
                valor={fmtPct(m.pro_labore_pct ?? 0)}
                bench="Meta: ≤ 25%"
                ok={(m.pro_labore_pct ?? 0) <= 0.25}
              />
              <Kpi
                titulo="Sazonalidade Univali"
                valor={sazonalForte ? "Forte 🔥" : "Fraca 📉"}
                bench={sazonalForte ? "Período de aula" : "Férias"}
                ok={sazonalForte}
              />
            </div>
          </section>

          {/* ANÁLISE ABC (Pareto) */}
          <section>
            <EyebrowTitle eyebrow="// ANÁLISE ABC" title="Quais produtos sustentam o negócio" level={2} />
            <p className="text-sm text-preto/70 mt-1 mb-3">
              Princípio de Pareto: poucos produtos puxam a maior parte da receita. Use isso pra
              priorizar foco e estoque.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <BlocoAbc titulo="Classe A · 80% da receita" cor="verde" items={abcA} />
              <BlocoAbc titulo="Classe B · próximos 15%" cor="amarelo" items={abcB} />
              <BlocoAbc titulo="Classe C · últimos 5%" cor="vermelho" items={abcC} />
            </div>
          </section>

          {/* DIA DA SEMANA */}
          <section>
            <EyebrowTitle eyebrow="// PADRÃO" title="Por dia da semana" level={2} />
            <Card>
              <GraficosAnalise dow={dow} horas={horas} dreHist={dreHist} mesAtual={mes} anoAtual={ano} />
            </Card>
          </section>

          {/* AÇÕES SUGERIDAS PELO MOTOR */}
          <section>
            <EyebrowTitle eyebrow="// O QUE FAZER" title="Recomendações" level={2} />
            <div className="space-y-2 mt-3">
              {(m.cmv_pct ?? 0) > 0.35 && (
                <Sugestao
                  titulo="Atacar CMV"
                  texto={`CMV em ${fmtPct(m.cmv_pct ?? 0)} acima da meta. Cada 1pp de redução libera ~${fmtBR(receita * 0.01)} por mês.`}
                  acao="Renegociar com top 3 fornecedores. Conferir gramatura na produção."
                />
              )}
              {conc3 > 0.70 && (
                <Sugestao
                  titulo="Diversificar mix"
                  texto={`Top 3 produtos fazem ${fmtPct(conc3)} da receita. Risco se um falhar.`}
                  acao={`Promover ${abcB.slice(0,2).map((p:any)=>p.nome).join(" e ")} pra trazer pra Classe A.`}
                />
              )}
              {dispersao > 0.50 && (
                <Sugestao
                  titulo="Equilibrar dias da semana"
                  texto={`Dispersão de ${fmtPct(dispersao)} entre dia mais forte e mais fraco.`}
                  acao="Promoção segmentada nos dias devagar (combo, happy hour)."
                />
              )}
              {pctPico > 0.30 && picoHora && (
                <Sugestao
                  titulo={`Pico concentrado em ${picoHora.hora}h`}
                  texto={`${fmtPct(pctPico)} das vendas nessa única hora.`}
                  acao={`Pré-produzir pizzas mais vendidas. Garantir 2 atendentes no horário ${picoHora.hora}-${picoHora.hora + 1}h.`}
                />
              )}
              {abcC.length > 5 && (
                <Sugestao
                  titulo="Tirar produtos parados"
                  texto={`${abcC.length} produtos fazem apenas 5% da receita. Manter no menu custa SKU + complexidade.`}
                  acao="Considerar descontinuar os de menor giro."
                />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SeletorMes({ ano, mes }: { ano: number; mes: number }) {
  const hoje = new Date();
  const mAtual = hoje.getMonth() + 1;
  const aAtual = hoje.getFullYear();
  const mAnt = mAtual === 1 ? 12 : mAtual - 1;
  const aAnt = mAtual === 1 ? aAtual - 1 : aAtual;
  return (
    <div className="flex gap-2 items-center text-sm flex-wrap">
      <form className="flex gap-1 items-center">
        <select name="mes" defaultValue={mes} className="px-2 py-1 border-2 border-preto rounded bg-creme-claro">
          {mesPtBR.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select name="ano" defaultValue={ano} className="px-2 py-1 border-2 border-preto rounded bg-creme-claro">
          {[ano - 1, ano, ano + 1].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button type="submit" className="px-3 py-1 bg-amarelo border-2 border-preto rounded font-[family-name:var(--font-subtitulo)] text-xs">ver</button>
      </form>
      <Atalho href={`/analise?ano=${aAtual}&mes=${mAtual}`} label="Atual" ativo={mes===mAtual && ano===aAtual} />
      <Atalho href={`/analise?ano=${aAnt}&mes=${mAnt}`} label="Mês passado" ativo={mes===mAnt && ano===aAnt} />
    </div>
  );
}

function Atalho({ href, label, ativo }: { href: string; label: string; ativo: boolean }) {
  return (
    <a href={href} className={`text-xs px-2 py-1 border-2 border-preto rounded font-[family-name:var(--font-subtitulo)] ${ativo ? "bg-vermelho text-white" : "bg-creme-claro hover:bg-amarelo"}`}>
      {label}
    </a>
  );
}

function Kpi({ titulo, valor, bench, ok }: { titulo: string; valor: string; bench: string; ok: boolean }) {
  return (
    <Card className={cn("border-l-[6px]", ok ? "border-l-verde" : "border-l-vermelho")}>
      <div className="eyebrow">{titulo}</div>
      <div className="text-2xl font-[family-name:var(--font-titulo)] mt-1">{valor}</div>
      <div className={cn("text-[11px] font-[family-name:var(--font-mono)] mt-1", ok ? "text-verde" : "text-vermelho")}>{bench}</div>
    </Card>
  );
}

function BlocoAbc({ titulo, cor, items }: { titulo: string; cor: "verde" | "amarelo" | "vermelho"; items: any[] }) {
  const bg = cor === "verde" ? "bg-verde/10 border-verde" : cor === "amarelo" ? "bg-amarelo/20 border-amarelo-escuro" : "bg-vermelho/10 border-vermelho";
  return (
    <div className={cn("card-bruto border-[3px]", bg)}>
      <div className="font-[family-name:var(--font-subtitulo)] mb-2">{titulo}</div>
      <ul className="space-y-1 text-xs max-h-64 overflow-y-auto">
        {items.map((p: any) => (
          <li key={p.produto_codigo_origem ?? p.nome} className="flex justify-between gap-2">
            <span className="truncate">{p.nome}</span>
            <span className="font-[family-name:var(--font-mono)] text-preto/60">{fmtBR(Number(p.fat_total))}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-preto/40">vazio</li>}
      </ul>
    </div>
  );
}

function Sugestao({ titulo, texto, acao }: { titulo: string; texto: string; acao: string }) {
  return (
    <Card variant="creme">
      <div className="font-[family-name:var(--font-subtitulo)]">💡 {titulo}</div>
      <p className="text-sm mt-1">{texto}</p>
      <p className="text-xs mt-2 text-preto/70 font-[family-name:var(--font-mono)]"><strong>Ação:</strong> {acao}</p>
    </Card>
  );
}
