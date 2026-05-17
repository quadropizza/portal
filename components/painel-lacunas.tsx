import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { ArrowUpRight, AlertTriangle, AlertCircle, Info } from "lucide-react";

/**
 * Painel "Tá faltando preencher" — decisão §7.23 do CLAUDE.md.
 * Lê da view `painel_lacunas` que combina 6 fontes de lacuna.
 */
type Lacuna = {
  tipo: string;
  registro_id: string;
  descricao: string;
  link_resolver: string;
  severidade: "urgente" | "alta" | "media" | "controle";
};

const rotuloTipo: Record<string, string> = {
  produto_sem_ficha:              "Produto sem ficha técnica",
  insumo_custo_seed:              "Insumo com custo provisório (seed)",
  venda_produto_nao_cadastrado:   "Venda com produto não cadastrado",
  saida_sem_categoria:            "Saída sem categoria",
  obrigacao_vencida:              "Obrigação vencida",
  fornecedor_sem_categoria:       "Fornecedor sem categoria padrão",
};

export async function PainelLacunas() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("painel_lacunas")
    .select("*")
    .order("severidade", { ascending: true })
    .limit(50);

  const lacunas = (rows ?? []) as unknown as Lacuna[];

  if (lacunas.length === 0) {
    return (
      <Card variant="creme">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✨</span>
          <div>
            <div className="font-[family-name:var(--font-subtitulo)]">Tá tudo preenchido</div>
            <div className="text-xs text-preto/60">Nenhuma lacuna detectada nas suas entidades.</div>
          </div>
        </div>
      </Card>
    );
  }

  // agrupar por tipo
  const grupos = lacunas.reduce<Record<string, Lacuna[]>>((acc, l) => {
    (acc[l.tipo] ||= []).push(l);
    return acc;
  }, {});

  return (
    <section className="space-y-4">
      <EyebrowTitle
        eyebrow={`// ${lacunas.length} ITEM(NS)`}
        title="Tá faltando preencher"
        level={2}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(grupos).map(([tipo, items]) => (
          <Card key={tipo}>
            <div className="flex items-center gap-2 mb-3">
              {iconePorSeveridade(items[0].severidade)}
              <div className="font-[family-name:var(--font-subtitulo)]">
                {rotuloTipo[tipo] ?? tipo}
              </div>
              <span className="ml-auto text-xs font-[family-name:var(--font-mono)] bg-preto text-creme px-2 py-0.5 rounded">
                {items.length}
              </span>
            </div>
            <ul className="space-y-1">
              {items.slice(0, 5).map((l) => (
                <li key={l.registro_id}>
                  <Link
                    href={l.link_resolver as `/${string}`}
                    className="flex items-center justify-between gap-2 text-sm hover:bg-amarelo/30 rounded px-2 py-1 -mx-2"
                  >
                    <span className="truncate">{l.descricao}</span>
                    <ArrowUpRight size={14} className="shrink-0 text-preto/40" />
                  </Link>
                </li>
              ))}
              {items.length > 5 && (
                <li className="text-xs text-preto/50 px-2 pt-1 font-[family-name:var(--font-mono)]">
                  + {items.length - 5} restante(s)
                </li>
              )}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}

function iconePorSeveridade(s: Lacuna["severidade"]) {
  if (s === "urgente") return <AlertCircle size={18} className="text-vermelho" />;
  if (s === "alta")    return <AlertTriangle size={18} className="text-laranja" />;
  if (s === "media")   return <AlertTriangle size={18} className="text-amarelo-escuro" />;
  return <Info size={18} className="text-preto/50" />;
}
