import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ProducaoForm } from "./producao-form";
import { fmtDataBR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProducaoPage() {
  const supabase = await createClient();

  const [produtos, lotes, massas] = await Promise.all([
    supabase.from("produto").select("id, codigo, nome, categoria")
      .eq("produzido_em_lote", true).eq("ativo", true).is("deleted_at", null)
      .order("categoria").order("codigo"),
    supabase.from("producao_lote")
      .select("id, data, produtor_nome, observacoes, itens:producao_lote_item(produto_id, quantidade, produto:produto(nome))")
      .is("deleted_at", null).order("data", { ascending: false }).limit(10),
    supabase.from("insumo")
      .select("id, nome, unidade_padrao")
      .in("nome", ["Massa mini", "Massa quadrô grande"])
      .eq("ativo", true).is("deleted_at", null),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <EyebrowTitle eyebrow="// PRODUÇÃO" title="Registrar lote produzido" level={1} />
      <Card variant="creme">
        <p className="text-sm">
          Toda vez que produzir pizzas (3x/semana). O sistema <strong>aumenta o estoque
          de pizza pronta</strong> e <strong>baixa os insumos</strong> automaticamente
          via ficha técnica ativa.
        </p>
        <p className="text-xs mt-2 text-preto/60 font-[family-name:var(--font-mono)]">
          ⚠️ Pizzas doces são só massa — lance a quantidade de Massa mini / Massa quadrô grande
          produzida e o recheio fica pra hora do pedido.
        </p>
      </Card>
      <ProducaoForm
        produtos={(produtos.data ?? []) as any}
        massas={(massas.data ?? []) as any}
      />

      {((lotes.data ?? []) as any[]).length > 0 && (
        <section className="space-y-2">
          <EyebrowTitle eyebrow="// HISTÓRICO" title="Últimos lotes" level={3} />
          {((lotes.data ?? []) as any[]).map((l) => (
            <Card key={l.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-[family-name:var(--font-subtitulo)]">{fmtDataBR(l.data)} {l.produtor_nome ? `· ${l.produtor_nome}` : ""}</div>
                  <div className="text-xs text-preto/60 mt-1">
                    {(l.itens ?? []).map((i: any) => `${i.produto?.nome ?? "?"} × ${i.quantidade}`).join(" · ")}
                  </div>
                </div>
                <div className="text-xs font-[family-name:var(--font-mono)] text-preto/60">
                  total: {(l.itens ?? []).reduce((s: number, i: any) => s + i.quantidade, 0)} pizzas
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
