import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { CustosFixosManager } from "./custos-fixos-manager";

export const dynamic = "force-dynamic";

export default async function CustosFixosPage() {
  const supabase = await createClient();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;

  // Janela de avaliação de atraso: últimos 6 meses
  const inicioAno = new Date(ano, mes - 7, 1).getFullYear();

  const [custosR, pagamentosR, todosPagsR, catsR, fornsR] = await Promise.all([
    supabase.from("custo_fixo").select("*").is("deleted_at", null).order("dia_vencimento").order("nome"),
    supabase.from("custo_fixo_pagamento").select("*").eq("ano", ano).eq("mes", mes),
    supabase.from("custo_fixo_pagamento").select("custo_fixo_id, ano, mes").gte("ano", inicioAno),
    supabase.from("categoria_despesa").select("id,nome,grupo").eq("ativa", true).order("ordem"),
    supabase.from("fornecedor").select("id,nome,apelido").eq("ativo", true).order("nome"),
  ]);

  // Conta meses em atraso por custo
  const todosPags = (todosPagsR.data ?? []) as Array<{ custo_fixo_id: string; ano: number; mes: number }>;
  const pagosSetPorCusto = new Map<string, Set<string>>();
  for (const p of todosPags) {
    const key = `${p.ano}-${p.mes}`;
    if (!pagosSetPorCusto.has(p.custo_fixo_id)) pagosSetPorCusto.set(p.custo_fixo_id, new Set());
    pagosSetPorCusto.get(p.custo_fixo_id)!.add(key);
  }
  const mesesAvaliar: Array<{ a: number; m: number }> = [];
  for (let i = 6; i >= 1; i--) {
    const d = new Date(ano, mes - 1 - i, 1);
    mesesAvaliar.push({ a: d.getFullYear(), m: d.getMonth() + 1 });
  }
  const atrasoPorCusto: Record<string, number> = {};
  for (const c of ((custosR.data ?? []) as any[])) {
    const pagosSet = pagosSetPorCusto.get(c.id) ?? new Set();
    const criadoEm = new Date(c.created_at);
    const inicioMesCusto = new Date(criadoEm.getFullYear(), criadoEm.getMonth(), 1);
    const atrasos = mesesAvaliar.filter(({ a, m }) => {
      const dataM = new Date(a, m - 1, 1);
      return dataM >= inicioMesCusto && !pagosSet.has(`${a}-${m}`);
    }).length;
    atrasoPorCusto[c.id] = atrasos;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <EyebrowTitle eyebrow="// FINANCEIRO" title="Custos fixos" level={1} />

      <Card variant="creme">
        <p className="text-sm">
          Despesas recorrentes (aluguel, financiamento, software, energia, etc).
          Cada mês renova automaticamente. Se mês passado não foi marcado como pago,
          aparece <strong className="text-vermelho">badge de atraso</strong>.
        </p>
      </Card>

      <CustosFixosManager
        custos={(custosR.data ?? []) as any}
        pagamentosMes={(pagamentosR.data ?? []) as any}
        categorias={(catsR.data ?? []) as any}
        fornecedores={(fornsR.data ?? []) as any}
        ano={ano}
        mes={mes}
        atrasos={atrasoPorCusto}
      />
    </div>
  );
}
