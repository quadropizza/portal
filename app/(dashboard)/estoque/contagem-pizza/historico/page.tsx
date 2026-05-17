import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fmtDataBR } from "@/lib/utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HistoricoContagemPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contagem")
    .select(`id, data, observacoes,
             itens:contagem_item(produto_id, quantidade_contada, quantidade_esperada, divergencia,
                                  produto:produto(nome, categoria))`)
    .eq("tipo", "pizza")
    .is("deleted_at", null)
    .order("data", { ascending: false })
    .limit(30);

  const lista = (data ?? []) as any[];

  return (
    <div className="space-y-6 max-w-5xl">
      <EyebrowTitle eyebrow="// HISTÓRICO" title="Contagens de pizza" level={1} />

      {lista.length === 0 ? (
        <Card variant="amarelo"><p className="text-sm">Sem contagens registradas ainda.</p></Card>
      ) : (
        lista.map((c) => {
          const itens = c.itens ?? [];
          const divs = itens.filter((i: any) => Math.abs(i.divergencia) > 0);
          const totalContado = itens.reduce((s: number, i: any) => s + Number(i.quantidade_contada), 0);
          const totalEsperado = itens.reduce((s: number, i: any) => s + Number(i.quantidade_esperada ?? 0), 0);
          return (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-[family-name:var(--font-subtitulo)] text-lg">{fmtDataBR(c.data)}</div>
                  <div className="text-xs text-preto/60 font-[family-name:var(--font-mono)] mt-1">
                    {itens.length} pizzas contadas · contado {totalContado} · esperado {totalEsperado}
                  </div>
                  {c.observacoes && <div className="text-xs text-preto/70 mt-1 italic">{c.observacoes}</div>}
                </div>
                {divs.length > 0 ? (
                  <span className="flex items-center gap-1 text-xs bg-amarelo border-2 border-preto px-2 py-1 rounded font-[family-name:var(--font-subtitulo)]">
                    <AlertTriangle size={12} /> {divs.length} divergência(s)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-verde font-[family-name:var(--font-subtitulo)]">
                    <CheckCircle2 size={14} /> sem divergência
                  </span>
                )}
              </div>
              <table className="w-full text-xs">
                <thead className="text-preto/60 uppercase font-[family-name:var(--font-mono)]">
                  <tr className="border-b border-preto/10">
                    <th className="text-left py-1">Pizza</th>
                    <th className="text-right py-1 w-20">Esperado</th>
                    <th className="text-right py-1 w-20">Contado</th>
                    <th className="text-right py-1 w-24">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i: any) => {
                    const div = Number(i.divergencia);
                    return (
                      <tr key={i.produto_id} className="border-b border-preto/5">
                        <td className="py-1">{i.produto?.nome ?? "—"}</td>
                        <td className="text-right py-1 font-[family-name:var(--font-mono)]">{i.quantidade_esperada ?? "—"}</td>
                        <td className="text-right py-1 font-[family-name:var(--font-mono)]">{i.quantidade_contada}</td>
                        <td className={`text-right py-1 font-[family-name:var(--font-mono)] font-bold ${div > 0 ? "text-verde" : div < 0 ? "text-vermelho" : "text-preto/30"}`}>
                          {div > 0 ? "+" : ""}{div}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          );
        })
      )}
    </div>
  );
}
