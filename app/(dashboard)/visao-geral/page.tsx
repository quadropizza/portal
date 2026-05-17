import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { StatCard } from "@/components/ui/card";
import { PainelLacunas } from "@/components/painel-lacunas";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VisaoGeralPage() {
  const supabase = await createClient();

  // DRE do mês corrente (a view dre_mensal já filtra por current_empresa via RLS)
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;

  const { data: dre } = await supabase
    .from("dre_mensal")
    .select("*")
    .eq("ano", ano)
    .eq("mes", mes)
    .maybeSingle();

  const d = (dre ?? {}) as Record<string, number | undefined>;
  const receita = d.receita_bruta ?? 0;
  const cmv = d.cmv ?? 0;
  const cmvPct = receita > 0 ? Math.abs(cmv) / receita : 0;
  const lucroOp = d.lucro_operacional ?? 0;
  const lucroSocio = d.lucro_socio ?? 0;

  return (
    <div className="space-y-8 max-w-7xl">
      <EyebrowTitle
        eyebrow={`// MÊS ${String(mes).padStart(2, "0")}/${ano}`}
        title="Visão geral"
        level={1}
      />

      {receita === 0 ? (
        <div className="card-bruto bg-amarelo">
          <div className="font-[family-name:var(--font-subtitulo)] text-lg mb-2">
            🍕 Tá faltando alimentar o mês
          </div>
          <p className="text-sm">
            Sem dados de venda nem despesa pra {String(mes).padStart(2, "0")}/{ano} ainda.
            Comece anexando o PDF do Fast Report em <strong>Vendas → Dia</strong> ou
            o PDF do extrato em <strong>Financeiro → Saídas</strong>.
          </p>
        </div>
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
            label="Lucro operacional"
            valor={fmtBR(lucroOp)}
            hint="antes do pró-labore"
            destaque={lucroOp >= 0 ? "verde" : "vermelho"}
          />
          <StatCard
            label="Lucro do sócio"
            valor={fmtBR(lucroSocio)}
            hint="depois do pró-labore"
            destaque={lucroSocio >= 0 ? "verde" : "vermelho"}
          />
        </section>
      )}

      <PainelLacunas />
    </div>
  );
}
