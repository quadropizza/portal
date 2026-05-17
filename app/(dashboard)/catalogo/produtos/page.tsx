import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { fmtBR } from "@/lib/utils";
import { Plus, AlertTriangle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const rotuloCat: Record<string, string> = {
  pizza_grande: "Pizza grande",
  pizza_mini:   "Pizza mini",
  bebida:       "Bebida",
  sobremesa:    "Sobremesa",
  outro:        "Outro",
};

export default async function CatalogoProdutosPage() {
  const supabase = await createClient();

  const { data: produtos } = await supabase
    .from("produto")
    .select("id, codigo, nome, categoria, preco_venda, produzido_em_lote, ativo")
    .is("deleted_at", null)
    .order("categoria")
    .order("codigo");

  // produtos com ficha técnica ativa
  const { data: fichas } = await supabase
    .from("ficha_tecnica")
    .select("produto_id")
    .eq("ativa", true)
    .is("deleted_at", null);

  const comFicha = new Set(((fichas ?? []) as Array<{ produto_id: string }>).map((f) => f.produto_id));

  const lista = (produtos ?? []) as Array<{
    id: string; codigo: string; nome: string; categoria: string;
    preco_venda: number | null; produzido_em_lote: boolean; ativo: boolean;
  }>;

  // agrupa por categoria
  const grupos = lista.reduce<Record<string, typeof lista>>((acc, p) => {
    (acc[p.categoria] ||= []).push(p);
    return acc;
  }, {});

  const ordem = ["pizza_grande", "pizza_mini", "bebida", "sobremesa", "outro"];

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-end justify-between gap-4">
        <EyebrowTitle
          eyebrow={`// ${lista.length} PRODUTOS`}
          title="Catálogo"
          level={1}
        />
        <Link href="/catalogo/produtos/novo">
          <Button variant="vermelho"><Plus size={16} /> Novo produto</Button>
        </Link>
      </div>

      {lista.length === 0 && (
        <Card variant="creme">
          <p className="text-sm">
            Nenhum produto cadastrado ainda. Cadastre os sabores e bebidas do PDV pra
            que o parser de vendas consiga vincular cada venda ao produto certo.
          </p>
        </Card>
      )}

      {ordem.map((cat) => {
        const items = grupos[cat];
        if (!items?.length) return null;
        return (
          <section key={cat}>
            <div className="eyebrow mb-2">// {rotuloCat[cat]?.toUpperCase() ?? cat}</div>
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
                  <tr>
                    <th className="px-4 py-2 w-20">Cód</th>
                    <th className="px-4 py-2">Nome</th>
                    <th className="px-4 py-2 text-right w-28">Preço</th>
                    <th className="px-4 py-2 text-center w-24">Ficha</th>
                    <th className="px-4 py-2 text-center w-20">Status</th>
                    <th className="px-4 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-t border-preto/5 hover:bg-amarelo/10">
                      <td className="px-4 py-2 font-[family-name:var(--font-mono)]">{p.codigo}</td>
                      <td className="px-4 py-2 font-[family-name:var(--font-subtitulo)]">{p.nome}</td>
                      <td className="px-4 py-2 text-right">{p.preco_venda ? fmtBR(p.preco_venda) : "—"}</td>
                      <td className="px-4 py-2 text-center">
                        {comFicha.has(p.id) ? (
                          <CheckCircle2 size={16} className="text-verde inline" />
                        ) : (
                          <AlertTriangle size={16} className="text-amarelo-escuro inline" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-center text-xs">
                        {p.ativo ? <span className="text-verde">ativo</span> : <span className="text-preto/40">inativo</span>}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/catalogo/produtos/${p.id}`}
                          className="text-xs font-[family-name:var(--font-subtitulo)] text-vermelho hover:underline"
                        >
                          editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
