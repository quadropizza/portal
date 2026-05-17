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

  const [custosR, pagamentosR, catsR, fornsR] = await Promise.all([
    supabase.from("custo_fixo").select("*").is("deleted_at", null).order("dia_vencimento").order("nome"),
    supabase.from("custo_fixo_pagamento").select("*").eq("ano", ano).eq("mes", mes),
    supabase.from("categoria_despesa").select("id,nome,grupo").eq("ativa", true).order("ordem"),
    supabase.from("fornecedor").select("id,nome,apelido").eq("ativo", true).order("nome"),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <EyebrowTitle eyebrow="// FINANCEIRO" title="Custos fixos" level={1} />

      <Card variant="creme">
        <p className="text-sm">
          Despesas recorrentes (aluguel, financiamento, software, energia, etc).
          Cada mês, sistema mostra quais já foram pagos e quais ainda faltam.
          Marca como pago → gera saída automática categorizada.
        </p>
      </Card>

      <CustosFixosManager
        custos={(custosR.data ?? []) as any}
        pagamentosMes={(pagamentosR.data ?? []) as any}
        categorias={(catsR.data ?? []) as any}
        fornecedores={(fornsR.data ?? []) as any}
        ano={ano}
        mes={mes}
      />
    </div>
  );
}
