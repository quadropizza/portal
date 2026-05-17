import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fmtBR } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FichasPage() {
  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produto")
    .select(`id, codigo, nome, categoria, preco_venda, produzido_em_lote,
             fichas:ficha_tecnica(id, versao, ativa,
               itens:ficha_tecnica_item(quantidade, unidade, insumo:insumo(nome, custo_medio_atual, custo_origem)))`)
    .eq("produzido_em_lote", true)
    .eq("ativo", true)
    .is("deleted_at", null)
    .order("categoria").order("codigo");

  const lista = (produtos ?? []) as any[];

  function custoCalculado(ficha: any): { total: number; algumSeed: boolean } {
    if (!ficha?.itens) return { total: 0, algumSeed: false };
    let total = 0; let seed = false;
    for (const it of ficha.itens) {
      const c = Number(it.insumo?.custo_medio_atual ?? 0);
      total += c * Number(it.quantidade);
      if (it.insumo?.custo_origem === "seed") seed = true;
    }
    return { total, algumSeed: seed };
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <EyebrowTitle eyebrow={`// ${lista.length} PRODUTOS`} title="Fichas técnicas" level={1} />

      <Card variant="creme">
        <p className="text-sm">
          Define o que entra em cada pizza. Custo é calculado em tempo real a partir
          do <strong>custo médio dos insumos</strong> (recalculado a cada NF-e — §7.21).
          Ícone 🟡 = algum insumo ainda no custo "seed" (não confirmado por NF).
        </p>
      </Card>

      <div className="space-y-3">
        {lista.map((p) => {
          const ficha = p.fichas?.find((f: any) => f.ativa);
          const { total: custo, algumSeed } = ficha ? custoCalculado(ficha) : { total: 0, algumSeed: false };
          const margem = p.preco_venda && custo > 0 ? (p.preco_venda - custo) / p.preco_venda : null;
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {ficha
                      ? algumSeed
                        ? <AlertTriangle size={16} className="text-amarelo-escuro" />
                        : <CheckCircle2 size={16} className="text-verde" />
                      : <AlertTriangle size={16} className="text-vermelho" />}
                    <span className="font-[family-name:var(--font-mono)] text-xs text-preto/60">{p.codigo}</span>
                    <span className="font-[family-name:var(--font-subtitulo)]">{p.nome}</span>
                  </div>
                  {ficha && ficha.itens && ficha.itens.length > 0 && (
                    <ul className="mt-2 text-xs text-preto/70 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5">
                      {ficha.itens.map((it: any, i: number) => (
                        <li key={i} className="font-[family-name:var(--font-mono)]">
                          • {it.insumo?.nome ?? "?"}: {it.quantidade} {it.unidade}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {ficha ? (
                    <>
                      <div className="text-xs text-preto/60">custo</div>
                      <div className="font-[family-name:var(--font-titulo)] text-xl">{fmtBR(custo)}</div>
                      {margem != null && (
                        <div className={`text-xs font-[family-name:var(--font-mono)] ${margem > 0.70 ? "text-verde" : margem > 0.50 ? "text-amarelo-escuro" : "text-vermelho"}`}>
                          margem {(margem * 100).toFixed(0)}%
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-vermelho">sem ficha</span>
                  )}
                  <div className="mt-2">
                    <Link href={`/catalogo/fichas-tecnicas/${p.id}`}
                      className="text-xs font-[family-name:var(--font-subtitulo)] text-vermelho hover:underline">
                      {ficha ? "editar" : "criar"} →
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
