import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ItemPlanoEditavel } from "./item-editavel";
import { gerarPlano } from "./actions";

export const dynamic = "force-dynamic";

const mesPtBR = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export default async function PlanoAcaoPage() {
  const supabase = await createClient();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;

  const { data: rows } = await supabase
    .from("plano_acao_item")
    .select("*")
    .eq("ano", ano)
    .eq("mes", mes)
    .is("deleted_at", null)
    .order("ordem");

  const itens = (rows ?? []) as Array<{
    id: string; titulo: string; descricao: string | null; acao_pratica: string | null;
    impacto_estimado_reais: number | null; impacto_descricao: string | null;
    severidade: "urgente" | "medio" | "controle" | "positivo";
    status: "pendente" | "em_andamento" | "concluido" | "arquivado";
    categoria_plano: "insight" | "organizacao" | "manual";
    trigger_regra: string | null;
    prazo: string | null;
  }>;

  const insights = itens.filter((i) => i.categoria_plano === "insight");
  const organizacao = itens.filter((i) => i.categoria_plano === "organizacao");
  const manuais = itens.filter((i) => i.categoria_plano === "manual");

  return (
    <div className="space-y-10 max-w-5xl">
      <div className="flex items-end justify-between gap-4">
        <EyebrowTitle
          eyebrow={`// ${mesPtBR[mes-1].toUpperCase()} ${ano}`}
          title="Plano de ação"
          level={1}
        />
        {itens.length === 0 && (
          <form action={gerarPlano}>
            <input type="hidden" name="ano" value={ano} />
            <input type="hidden" name="mes" value={mes} />
            <Button type="submit" variant="vermelho">Gerar plano do mês</Button>
          </form>
        )}
      </div>

      {itens.length === 0 && (
        <Card variant="amarelo">
          <p className="text-sm">
            Sem itens pra {mesPtBR[mes-1]}/{ano} ainda. Clica em
            <strong> Gerar plano do mês</strong> pra criar:
            <br />
            • <strong>Insights</strong> do fechamento do mês anterior (R001-R008 e P001-P009)
            <br />
            • <strong>Checklist de organização particular</strong> (14 itens recorrentes)
          </p>
        </Card>
      )}

      {insights.length > 0 && (
        <Bloco
          eyebrow="// PRIORIDADE — vem do mês anterior"
          titulo="Insights pra atacar"
          itens={insights}
        />
      )}

      {organizacao.length > 0 && (
        <Bloco
          eyebrow="// ROTINA — todo mês"
          titulo="Checklist de organização particular"
          itens={organizacao}
        />
      )}

      {manuais.length > 0 && (
        <Bloco
          eyebrow="// ADICIONADOS POR VOCÊ"
          titulo="Itens manuais"
          itens={manuais}
        />
      )}
    </div>
  );
}

function Bloco({
  eyebrow, titulo, itens,
}: {
  eyebrow: string; titulo: string;
  itens: Parameters<typeof ItemPlanoEditavel>[0]["item"][];
}) {
  const concluidos = itens.filter((i) => i.status === "concluido").length;
  return (
    <section className="space-y-3">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl md:text-3xl font-[family-name:var(--font-titulo)] leading-tight">
            {titulo}
          </h2>
          <span className="text-xs font-[family-name:var(--font-mono)] text-preto/60">
            {concluidos}/{itens.length} concluídos
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {itens.map((item) => <ItemPlanoEditavel key={item.id} item={item} />)}
      </div>
    </section>
  );
}
