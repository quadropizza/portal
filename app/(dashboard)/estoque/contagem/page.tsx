import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ContagemForm } from "./contagem-form";
import { fmtDataBR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContagemPage() {
  const supabase = await createClient();

  const [insumos, contagens] = await Promise.all([
    supabase.from("insumo").select("id, nome, unidade_padrao, custo_medio_atual")
      .eq("ativo", true).is("deleted_at", null).order("nome"),
    supabase.from("contagem")
      .select("id, data, tipo, observacoes, itens:contagem_item(insumo_id, quantidade_contada, divergencia, valor_divergencia)")
      .is("deleted_at", null)
      .order("data", { ascending: false }).limit(10),
  ]);

  return (
    <div className="space-y-8 max-w-5xl">
      <EyebrowTitle eyebrow="// CONTAGEM" title="Contagem de estoque" level={1} />

      <Card variant="creme">
        <p className="text-sm">
          Conferir o que tem na prateleira/freezer vs o que o sistema acha que tem.
          Divergência aparece automaticamente — pode ser perda, contagem errada anterior,
          ou movimentação não lançada.
        </p>
      </Card>

      <ContagemForm insumos={(insumos.data ?? []) as any} />

      {(contagens.data ?? []).length > 0 && (
        <section className="space-y-3">
          <EyebrowTitle eyebrow="// HISTÓRICO" title="Últimas contagens" level={3} />
          {((contagens.data ?? []) as any[]).map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-[family-name:var(--font-subtitulo)]">{fmtDataBR(c.data)}</div>
                  <div className="text-xs text-preto/60">{c.tipo} · {c.itens?.length ?? 0} itens contados</div>
                </div>
                {c.itens && c.itens.some((i: any) => Math.abs(i.divergencia) > 0.001) && (
                  <span className="text-xs bg-amarelo px-2 py-1 rounded font-[family-name:var(--font-mono)]">
                    {c.itens.filter((i: any) => Math.abs(i.divergencia) > 0.001).length} divergência(s)
                  </span>
                )}
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
