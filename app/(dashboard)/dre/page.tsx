import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtPct, cn } from "@/lib/utils";
import { GraficosDre, GraficoComposicaoDespesas, GraficoLucros } from "./graficos";

export const dynamic = "force-dynamic";

const mesPtBR = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const mesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const rotuloGrupo: Record<string, { nome: string; ordem: number; cor: string }> = {
  cmv:                   { nome: "CMV",                  ordem: 1, cor: "#E8742C" },
  folha:                 { nome: "Folha & encargos",     ordem: 2, cor: "#FFC528" },
  impostos:              { nome: "Impostos",             ordem: 3, cor: "#9C27B0" },
  aluguel:               { nome: "Aluguel",              ordem: 4, cor: "#2196F3" },
  bancarias:             { nome: "Bancárias",            ordem: 5, cor: "#795548" },
  outros:                { nome: "Outras op.",           ordem: 6, cor: "#757575" },
  pro_labore_lucas:      { nome: "Pró-labore Lucas",     ordem: 7, cor: "#D32027" },
  pro_labore_alessandra: { nome: "Pró-labore Alessandra", ordem: 8, cor: "#9E1015" },
};

export default async function DrePage({ searchParams }: { searchParams: Promise<{ ano?: string; mes?: string }> }) {
  const sp = await searchParams;
  const hoje = new Date();
  const ano = sp.ano ? Number(sp.ano) : hoje.getFullYear();
  const mes = sp.mes ? Number(sp.mes) : hoje.getMonth() + 1;

  const supabase = await createClient();
  const [dreR, detR, anteriorR, historicoR] = await Promise.all([
    supabase.from("dre_mensal").select("*").eq("ano", ano).eq("mes", mes).maybeSingle(),
    supabase.from("dre_mensal_detalhado").select("*").eq("ano", ano).eq("mes", mes).order("categoria_ordem"),
    supabase.from("dre_mensal").select("*").eq("ano", mes === 1 ? ano-1 : ano).eq("mes", mes === 1 ? 12 : mes-1).maybeSingle(),
    supabase.from("dre_mensal").select("*").order("ano").order("mes"),
  ]);
  const d: Record<string, number | undefined> = dreR.data ?? {};
  const det = (detR.data ?? []) as Array<{ grupo: string; total: number }>;
  const prev: Record<string, number | undefined> | null = anteriorR.data ?? null;
  const hist = (historicoR.data ?? []) as Array<{ ano: number; mes: number; receita_bruta: number; cmv: number; folha: number; impostos: number; aluguel: number; bancarias: number; outros: number; lucro_operacional: number; lucro_socio: number }>;

  const receita = Number(d.receita_bruta ?? 0);
  const cmv = Math.abs(Number(d.cmv ?? 0));
  const lucroBruto = receita - cmv;
  const folha = Math.abs(Number(d.folha ?? 0));
  const impostos = Math.abs(Number(d.impostos ?? 0));
  const aluguel = Math.abs(Number(d.aluguel ?? 0));
  const bancarias = Math.abs(Number(d.bancarias ?? 0));
  const outros = Math.abs(Number(d.outros ?? 0));
  const proLab = Math.abs(Number(d.pro_labore_lucas ?? 0)) + Math.abs(Number(d.pro_labore_alessandra ?? 0));
  const despOp = folha + impostos + aluguel + bancarias + outros;
  const lucroOp = lucroBruto - despOp;
  const lucroLiq = lucroOp - proLab;
  const pct = (v: number) => receita > 0 ? v / receita : 0;

  const histChart = hist.slice(-12).map((h) => {
    const r = Number(h.receita_bruta);
    const c = Math.abs(Number(h.cmv));
    const dop = c + Math.abs(Number(h.folha)) + Math.abs(Number(h.impostos)) + Math.abs(Number(h.aluguel)) + Math.abs(Number(h.bancarias)) + Math.abs(Number(h.outros));
    const lbruto = r - c;
    return {
      label: `${mesAbrev[h.mes-1]}/${String(h.ano).slice(-2)}`,
      receita: r,
      cmv: c,
      despesas: dop - c,
      pro_labore: Math.abs(Number(h.lucro_operacional) - Number(h.lucro_socio)),
      lucro_bruto: lbruto,
      lucro_op: Number(h.lucro_operacional),
      lucro_socio: Number(h.lucro_socio),
      margem_bruta: r > 0 ? (lbruto / r) * 100 : 0,
      margem_op: r > 0 ? (Number(h.lucro_operacional) / r) * 100 : 0,
      margem_socio: r > 0 ? (Number(h.lucro_socio) / r) * 100 : 0,
    };
  });

  const composicao = Object.entries(rotuloGrupo).map(([grupo, info]) => {
    const linhas = det.filter((l) => l.grupo === grupo);
    return {
      grupo, nome: info.nome, cor: info.cor,
      valor: linhas.reduce((s, l) => s + Math.abs(Number(l.total)), 0),
    };
  }).filter((c) => c.valor > 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <EyebrowTitle eyebrow={`// ${mesPtBR[mes-1].toUpperCase()} ${ano}`} title="DRE mensal" level={1} />
        <SeletorMes ano={ano} mes={mes} />
      </div>

      {receita === 0 ? (
        <Card variant="amarelo"><p className="text-sm">Sem dados em {mesPtBR[mes-1]}/{ano}.</p></Card>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <LucroCard titulo="Receita BRUTA" valor={receita} pctReceita={1} cor="verde" />
            <LucroCard titulo="Lucro BRUTO" valor={lucroBruto} pctReceita={pct(lucroBruto)} cor={lucroBruto >= 0 ? "verde" : "vermelho"} hint="receita − CMV" />
            <LucroCard titulo="Lucro OPERACIONAL" valor={lucroOp} pctReceita={pct(lucroOp)} cor={lucroOp >= 0 ? "verde" : "vermelho"} hint="− despesas op." />
            <LucroCard titulo="Lucro LÍQUIDO" valor={lucroLiq} pctReceita={pct(lucroLiq)} cor={lucroLiq >= 0 ? "verde" : "vermelho"} hint="− pró-labore" />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <div className="eyebrow mb-2">// COMPOSIÇÃO DAS SAÍDAS</div>
              <GraficoComposicaoDespesas data={composicao} />
            </Card>
            <Card>
              <div className="eyebrow mb-2">// MARGENS · ÚLTIMOS MESES</div>
              <GraficoLucros data={histChart} />
            </Card>
          </section>

          {hist.length > 1 && (
            <section>
              <div className="eyebrow mb-2">// HISTÓRICO MENSAL</div>
              <Card>
                <GraficosDre data={histChart} />
              </Card>
            </section>
          )}

          <section>
            <div className="eyebrow mb-2">// DETALHAMENTO POR CATEGORIA</div>
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-preto text-creme">
                  <tr>
                    <th className="px-3 py-2 text-left font-[family-name:var(--font-subtitulo)]">Conta</th>
                    <th className="px-3 py-2 text-right font-[family-name:var(--font-subtitulo)] w-32">{mesPtBR[mes-1]}</th>
                    <th className="px-3 py-2 text-right font-[family-name:var(--font-subtitulo)] w-16">%</th>
                    {prev && <th className="px-3 py-2 text-right font-[family-name:var(--font-subtitulo)] w-28 hidden md:table-cell">Anterior</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-verde/10 border-b-2 border-preto">
                    <td className="px-3 py-2 font-[family-name:var(--font-subtitulo)]">(+) RECEITA BRUTA</td>
                    <td className="px-3 py-2 text-right font-[family-name:var(--font-titulo)] text-base text-verde">{fmtBR(receita)}</td>
                    <td className="px-3 py-2 text-right">100%</td>
                    {prev && <td className="px-3 py-2 text-right text-xs font-[family-name:var(--font-mono)] hidden md:table-cell">{fmtBR(Number(prev.receita_bruta))}</td>}
                  </tr>
                  <tr className="bg-laranja/10 border-b border-preto/30">
                    <td className="px-3 py-2 font-[family-name:var(--font-subtitulo)]">(−) CMV</td>
                    <td className="px-3 py-2 text-right text-vermelho">{fmtBR(cmv)}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(pct(cmv))}</td>
                    {prev && <td className="px-3 py-2 text-right text-xs font-[family-name:var(--font-mono)] hidden md:table-cell">{fmtBR(Math.abs(Number(prev.cmv)))}</td>}
                  </tr>
                  <tr className={cn("bg-amarelo/30 border-b-2 border-preto", lucroBruto >= 0 ? "" : "bg-vermelho/10")}>
                    <td className="px-3 py-2 font-[family-name:var(--font-subtitulo)]">(=) LUCRO BRUTO</td>
                    <td className="px-3 py-2 text-right font-[family-name:var(--font-titulo)] text-base">{fmtBR(lucroBruto)}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(pct(lucroBruto))}</td>
                    {prev && <td className="px-3 py-2 text-right text-xs hidden md:table-cell">—</td>}
                  </tr>

                  {Object.entries(rotuloGrupo).filter(([g]) => g !== "pro_labore_lucas" && g !== "pro_labore_alessandra").sort((a, b) => a[1].ordem - b[1].ordem).map(([grupo, info]) => {
                    const linhas = det.filter((l) => l.grupo === grupo);
                    const valor = linhas.reduce((s, l) => s + Math.abs(Number(l.total)), 0);
                    if (valor === 0) return null;
                    return (
                      <tr key={grupo} className="border-b border-preto/5">
                        <td className="px-3 py-2 pl-6 text-preto/80">(−) {info.nome}</td>
                        <td className="px-3 py-2 text-right text-vermelho text-sm">{fmtBR(valor)}</td>
                        <td className="px-3 py-2 text-right text-xs">{fmtPct(pct(valor))}</td>
                        {prev && <td className="px-3 py-2 text-right text-xs font-[family-name:var(--font-mono)] hidden md:table-cell">{fmtBR(Math.abs(Number(prev?.[grupo] ?? 0)))}</td>}
                      </tr>
                    );
                  })}

                  <tr className={cn("border-t-2 border-preto", lucroOp >= 0 ? "bg-verde/15" : "bg-vermelho/15")}>
                    <td className="px-3 py-2 font-[family-name:var(--font-subtitulo)]">(=) LUCRO OPERACIONAL</td>
                    <td className="px-3 py-2 text-right font-[family-name:var(--font-titulo)] text-base">{fmtBR(lucroOp)}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(pct(lucroOp))}</td>
                    {prev && <td className="px-3 py-2 text-right text-xs font-[family-name:var(--font-mono)] hidden md:table-cell">{fmtBR(Number(prev.lucro_operacional))}</td>}
                  </tr>

                  <tr className="border-b border-preto/5">
                    <td className="px-3 py-2 pl-6">(−) Pró-labore Lucas</td>
                    <td className="px-3 py-2 text-right text-vermelho text-sm">{fmtBR(Math.abs(Number(d.pro_labore_lucas ?? 0)))}</td>
                    <td className="px-3 py-2 text-right text-xs">{fmtPct(pct(Math.abs(Number(d.pro_labore_lucas ?? 0))))}</td>
                    {prev && <td className="px-3 py-2 text-right text-xs hidden md:table-cell">—</td>}
                  </tr>
                  <tr className="border-b border-preto/5">
                    <td className="px-3 py-2 pl-6">(−) Pró-labore Alessandra</td>
                    <td className="px-3 py-2 text-right text-vermelho text-sm">{fmtBR(Math.abs(Number(d.pro_labore_alessandra ?? 0)))}</td>
                    <td className="px-3 py-2 text-right text-xs">{fmtPct(pct(Math.abs(Number(d.pro_labore_alessandra ?? 0))))}</td>
                    {prev && <td className="px-3 py-2 text-right text-xs hidden md:table-cell">—</td>}
                  </tr>

                  <tr className={cn("border-t-2 border-preto", lucroLiq >= 0 ? "bg-verde/25" : "bg-vermelho/25")}>
                    <td className="px-3 py-2 font-[family-name:var(--font-subtitulo)]">(=) LUCRO LÍQUIDO</td>
                    <td className="px-3 py-2 text-right font-[family-name:var(--font-titulo)] text-lg">{fmtBR(lucroLiq)}</td>
                    <td className="px-3 py-2 text-right font-bold">{fmtPct(pct(lucroLiq))}</td>
                    {prev && <td className="px-3 py-2 text-right text-xs font-[family-name:var(--font-mono)] hidden md:table-cell">{fmtBR(Number(prev.lucro_socio))}</td>}
                  </tr>
                </tbody>
              </table>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function LucroCard({ titulo, valor, pctReceita, cor, hint }: { titulo: string; valor: number; pctReceita: number; cor: "verde" | "vermelho"; hint?: string }) {
  return (
    <Card className={cn("border-l-[6px]", cor === "verde" ? "border-l-verde" : "border-l-vermelho")}>
      <div className="eyebrow">{titulo}</div>
      <div className={cn("text-2xl font-[family-name:var(--font-titulo)] leading-none mt-1", cor === "vermelho" && "text-vermelho")}>
        {fmtBR(valor)}
      </div>
      <div className="text-xs mt-1 font-[family-name:var(--font-mono)] text-preto/60">
        {fmtPct(pctReceita)} da receita
      </div>
      {hint && <div className="text-[10px] mt-0.5 text-preto/40">{hint}</div>}
    </Card>
  );
}

function SeletorMes({ ano, mes }: { ano: number; mes: number }) {
  return (
    <form className="flex gap-2 items-center text-sm">
      <select name="mes" defaultValue={mes} className="px-2 py-1 border-2 border-preto rounded bg-creme-claro">
        {mesPtBR.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
      </select>
      <select name="ano" defaultValue={ano} className="px-2 py-1 border-2 border-preto rounded bg-creme-claro">
        {[ano - 1, ano, ano + 1].map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <button type="submit" className="px-3 py-1 bg-amarelo border-2 border-preto rounded font-[family-name:var(--font-subtitulo)] text-xs">ver</button>
    </form>
  );
}
