import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { SaidaForm } from "../saida-form";
import { createClient } from "@/lib/supabase/server";

export default async function NovaSaidaPage() {
  const supabase = await createClient();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  const [cats, forns, nfsAb, custosFix, custosPagos] = await Promise.all([
    supabase.from("categoria_despesa").select("id,nome,grupo").eq("ativa", true).order("ordem"),
    supabase.from("fornecedor").select("id,nome,apelido").eq("ativo", true).order("nome"),
    supabase.from("obrigacao_a_pagar").select("id, numero, valor_total, valor_pago, data_vencimento, categoria_id, fornecedor_id, fornecedor:fornecedor(apelido,nome)")
      .eq("status","em_aberto").is("deleted_at", null).order("data_vencimento"),
    supabase.from("custo_fixo").select("id, nome, valor_estimado, categoria_id, fornecedor_id, forma_pagamento")
      .eq("ativo",true).is("deleted_at", null).order("nome"),
    supabase.from("custo_fixo_pagamento").select("custo_fixo_id").eq("ano",ano).eq("mes",mes),
  ]);
  const pagosIds = new Set(((custosPagos.data ?? []) as any[]).map(p => p.custo_fixo_id));
  const custosPendentes = ((custosFix.data ?? []) as any[]).filter(c => !pagosIds.has(c.id));
  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// NOVA" title="Lançar saída manual" level={1} />
      <SaidaForm modo="novo"
        categorias={(cats.data ?? []) as any}
        fornecedores={(forns.data ?? []) as any}
        nfsAbertas={(nfsAb.data ?? []) as any}
        custosFixos={custosPendentes as any}
      />
    </div>
  );
}
