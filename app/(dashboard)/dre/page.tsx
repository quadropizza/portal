import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtPct, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const mesPtBR = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const rotuloGrupo: Record<string, { nome: string; ordem: number }> = {
  cmv:                   { nome: "(−) CMV",                    ordem: 1 },
  folha:                 { nome: "(−) Folha & encargos",       ordem: 2 },
  impostos:              { nome: "(−) Impostos",               ordem: 3 },
  aluguel:               { nome: "(−) Aluguel",                ordem: 4 },
  bancarias:             { nome: "(−) Despesas bancárias",     ordem: 5 },
  outros:                { nome: "(−) Outras op.",             ordem: 6 },
  pro_labore_lucas:      { nome: "(−) Pró-labore Lucas",       ordem: 7 },
  pro_labore_alessandra: { nome: "(−) Pró-labore Alessandra",  ordem: 8 },
};

export default async function DrePage({ searchParams }: { searchParams: Promise<{ ano?: string; mes?: string }> }) {
  const sp = await searchParams;
  const hoje = new Date();
  const ano = sp.ano ? Number(sp.ano) : hoje.getFullYear();
  const mes = sp.mes ? Number(sp.mes) : hoje.getMonth() + 1;

  const supabase = await createClient();
  const [dreR, detR, anteriorR] = await Promise.all([
    supabase.from("dre_mensal").select("*").eq("ano", ano).eq("mes", mes).maybeSingle(),
    supabase.from("dre_mensal_detalhado").select("*").eq("ano", ano).eq("mes", mes).order("categoria_ordem"),
    supabase.from("dre_mensal").select("*").eq("ano", mes === 1 ? ano-1 : ano).eq("mes", mes === 1 ? 12 : mes-1).maybeSingle(),
  ]);
  const d: any = dreR.data ?? {};
  const det = (detR.data ?? []) as any[];
  const prev: any = anteriorR.data ?? null;

  const receita = Number(d.receita_bruta ?? 0);
  const variacao = (atual: number, anterior: number | null) =>
    anterior && anterior !== 0 ? (atual - anterior) / anterior : null;

  return (
    <div className="space-y-8 max-w-4xl">
      <EyebrowTitle eyebrow={`// ${mesPtBR[mes-1].toUpperCase()} ${ano}`} title="DRE mensal" level={1} />

      {receita === 0 ? (
        <Card variant="amarelo">
          <p className="text-sm">Sem dados em {mesPtBR[mes-1]}/{ano}. Suba o relatório de vendas e o extrato bancário.</p>
        </Card>
      ) : (
        <>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-preto text-creme">
                <tr>
                  <th className="px-4 py-3 text-left font-[family-name:var(--font-subtitulo)]">Conta</th>
                  <th className="px-4 py-3 text-right font-[family-name:var(--font-subtitulo)] w-36">{mesPtBR[mes-1]}/{ano}</th>
                  <th className="px-4 py-3 text-right font-[family-name:var(--font-subtitulo)] w-24">% Rec</th>
                  {prev && <th className="px-4 py-3 text-right font-[family-name:var(--font-subtitulo)] w-32">Mês anterior</th>}
                  {prev && <th className="px-4 py-3 text-right font-[family-name:var(--font-subtitulo)] w-20">Δ</th>}
                </tr>
              </thead>
              <tbody>
                {/* Receita */}
                <tr className="bg-verde/10 border-b-2 border-preto">
                  <td className="px-4 py-2 font-[family-name:var(--font-subtitulo)]">(+) RECEITA BRUTA</td>
                  <td className="px-4 py-2 text-right font-[family-name:var(--font-titulo)] text-lg text-verde">{fmtBR(receita)}</td>
                  <td className="px-4 py-2 text-right">{fmtPct(1)}</td>
                  {prev && <td className="px-4 py-2 text-right text-preto/60 font-[family-name:var(--font-mono)] text-xs">{fmtBR(Number(prev.receita_bruta))}</td>}
                  {prev && <td className="px-4 py-2 text-right text-xs">{deltaPct(variacao(receita, Number(prev.receita_bruta)))}</td>}
                </tr>

                {/* Grupos */}
                {Object.entries(rotuloGrupo).sort((a, b) => a[1].ordem - b[1].ordem).map(([grupo, info]) => {
                  const linhas = det.filter((l: any) => l.grupo === grupo);
                  const valor = linhas.reduce((s: number, l: any) => s + Number(l.total), 0);
                  const valorPrev = prev?.[grupo] ?? 0;
                  if (linhas.length === 0 && valor === 0) return null;
                  return (
                    <>
                      <tr key={grupo} className="bg-creme-claro border-t-2 border-preto/20">
                        <td className="px-4 py-2 font-[family-name:var(--font-subtitulo)]">{info.nome}</td>
                        <td className="px-4 py-2 text-right font-[family-name:var(--font-subtitulo)] text-vermelho">{fmtBR(valor)}</td>
                        <td className="px-4 py-2 text-right">{receita > 0 ? fmtPct(Math.abs(valor)/receita) : "—"}</td>
                        {prev && <td className="px-4 py-2 text-right text-preto/60 font-[family-name:var(--font-mono)] text-xs">{fmtBR(Math.abs(valorPrev))}</td>}
                        {prev && <td className="px-4 py-2 text-right text-xs">{deltaPct(variacao(Math.abs(valor), Math.abs(valorPrev)))}</td>}
                      </tr>
                      {linhas.map((l: any) => (
                        <tr key={l.grupo + l.categoria_nome} className="text-preto/70 text-xs">
                          <td className="px-8 py-1">• {l.categoria_nome}</td>
                          <td className="px-4 py-1 text-right font-[family-name:var(--font-mono)]">{fmtBR(Number(l.total))}</td>
                          <td className="px-4 py-1 text-right">{receita > 0 ? fmtPct(Math.abs(Number(l.total))/receita) : ""}</td>
                          {prev && <td colSpan={2}></td>}
                        </tr>
                      ))}
                    </>
                  );
                })}

                {/* Lucro operacional */}
                <tr className={cn("border-t-2 border-preto", Number(d.lucro_operacional) >= 0 ? "bg-verde/15" : "bg-vermelho/15")}>
                  <td className="px-4 py-3 font-[family-name:var(--font-subtitulo)]">(=) LUCRO OPERACIONAL <span className="text-xs text-preto/60">(antes do pró-labore)</span></td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-titulo)] text-lg">{fmtBR(Number(d.lucro_operacional))}</td>
                  <td className="px-4 py-3 text-right">{receita > 0 ? fmtPct(Number(d.lucro_operacional)/receita) : "—"}</td>
                  {prev && <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] text-xs">{fmtBR(Number(prev.lucro_operacional))}</td>}
                  {prev && <td className="px-4 py-3 text-right text-xs">{deltaPct(variacao(Number(d.lucro_operacional), Number(prev.lucro_operacional)))}</td>}
                </tr>

                {/* Lucro do sócio */}
                <tr className={cn("border-t-2 border-preto", Number(d.lucro_socio) >= 0 ? "bg-verde/25" : "bg-vermelho/25")}>
                  <td className="px-4 py-3 font-[family-name:var(--font-subtitulo)]">(=) LUCRO DO SÓCIO <span className="text-xs text-preto/60">(depois do pró-labore)</span></td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-titulo)] text-xl">{fmtBR(Number(d.lucro_socio))}</td>
                  <td className="px-4 py-3 text-right">{receita > 0 ? fmtPct(Number(d.lucro_socio)/receita) : "—"}</td>
                  {prev && <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] text-xs">{fmtBR(Number(prev.lucro_socio))}</td>}
                  {prev && <td className="px-4 py-3 text-right text-xs">{deltaPct(variacao(Number(d.lucro_socio), Number(prev.lucro_socio)))}</td>}
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function deltaPct(v: number | null) {
  if (v == null) return <span className="text-preto/40">—</span>;
  const cls = v > 0 ? "text-verde" : v < 0 ? "text-vermelho" : "";
  const sinal = v > 0 ? "+" : "";
  return <span className={cls}>{sinal}{(v * 100).toFixed(1)}%</span>;
}
