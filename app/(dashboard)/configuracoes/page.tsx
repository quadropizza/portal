import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { MetasForm } from "./metas-form";
import { ChecklistTemplate } from "./checklist-template";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const supabase = await createClient();
  const [emp, tpl] = await Promise.all([
    supabase.from("empresa").select("*").maybeSingle(),
    supabase.from("template_organizacao").select("*").order("ordem"),
  ]);
  const empresa = emp.data as any;
  const template = (tpl.data ?? []) as any[];

  return (
    <div className="space-y-8 max-w-3xl">
      <EyebrowTitle eyebrow="// AJUSTAR" title="Configurações" level={1} />

      {empresa && (
        <section className="space-y-3">
          <EyebrowTitle eyebrow="// METAS" title="Metas do negócio" level={3} />
          <Card variant="creme">
            <p className="text-xs text-preto/70">
              Essas metas alimentam os badges automáticos no dashboard
              (alto/atenção/saudável) e disparam os insights R001-R008. Calibre
              com a realidade da pizzaria — meta agressiva demais vira ruído.
            </p>
          </Card>
          <MetasForm empresa={empresa} />
        </section>
      )}

      <section className="space-y-3">
        <EyebrowTitle eyebrow={`// ${template.length} ITENS`} title="Checklist de organização particular" level={3} />
        <Card variant="creme">
          <p className="text-xs text-preto/70">
            Esses itens são clonados todo mês quando o plano de ação é gerado
            (decisão §7.23). Você pode editar texto, prazo, ordem ou desativar
            o que não usa.
          </p>
        </Card>
        <ChecklistTemplate items={template} />
      </section>

      <section className="space-y-3">
        <EyebrowTitle eyebrow="// SISTEMA" title="Informações" level={3} />
        <Card>
          <dl className="text-sm space-y-1 font-[family-name:var(--font-mono)]">
            <div className="flex justify-between"><dt className="text-preto/60">Empresa</dt><dd>{empresa?.nome}</dd></div>
            <div className="flex justify-between"><dt className="text-preto/60">CNPJ</dt><dd>{empresa?.cnpj}</dd></div>
            <div className="flex justify-between"><dt className="text-preto/60">Plataforma</dt><dd>Quadrô Portal v0.1</dd></div>
            <div className="flex justify-between"><dt className="text-preto/60">Repo</dt><dd>github.com/quadropizza/portal</dd></div>
          </dl>
        </Card>
      </section>
    </div>
  );
}
