import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { fmtBR } from "@/lib/utils";
import { Plus, AlertTriangle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  const supabase = await createClient();
  const { data: insumos } = await supabase
    .from("insumo").select("id, nome, unidade_padrao, custo_medio_atual, custo_origem, ultima_compra_data, ativo")
    .is("deleted_at", null).order("nome");
  const lista = (insumos ?? []) as any[];

  const seed = lista.filter((i) => i.custo_origem === "seed").length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between gap-3">
        <EyebrowTitle eyebrow={`// ${lista.length} INSUMOS`} title="Estoque · insumos" level={1} />
        <div className="flex gap-2">
          <Link href="/estoque/contagem"><Button variant="creme">Contagem</Button></Link>
          <Link href="/estoque/insumos/novo"><Button variant="vermelho"><Plus size={14} /> Novo</Button></Link>
        </div>
      </div>

      {seed > 0 && (
        <Card variant="amarelo">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle size={16} />
            <strong>{seed}</strong> insumo(s) com custo "seed" (do .docx, não confirmado por NF).
            Primeira NF-e processada vai substituir pelo custo real (§7.21).
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
            <tr>
              <th className="px-4 py-2 text-left">Insumo</th>
              <th className="px-4 py-2 text-left w-16">Un</th>
              <th className="px-4 py-2 text-right w-32">Custo médio</th>
              <th className="px-4 py-2 text-center w-24">Fonte</th>
              <th className="px-4 py-2 text-left w-32">Última NF</th>
              <th className="px-4 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((i) => (
              <tr key={i.id} className="border-t border-preto/5 hover:bg-amarelo/10">
                <td className="px-4 py-2 font-[family-name:var(--font-subtitulo)]">{i.nome}</td>
                <td className="px-4 py-2 text-xs text-preto/60 font-[family-name:var(--font-mono)]">{i.unidade_padrao}</td>
                <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">{i.custo_medio_atual ? fmtBR(i.custo_medio_atual) : "—"}</td>
                <td className="px-4 py-2 text-center text-xs">
                  {i.custo_origem === "nf" && <span className="text-verde flex items-center justify-center gap-1"><CheckCircle2 size={12} /> NF</span>}
                  {i.custo_origem === "seed" && <span className="text-amarelo-escuro">seed</span>}
                  {i.custo_origem === "manual" && <span className="text-preto/60">manual</span>}
                </td>
                <td className="px-4 py-2 text-xs text-preto/60 font-[family-name:var(--font-mono)]">{i.ultima_compra_data ?? "—"}</td>
                <td className="px-4 py-2"><Link href={`/estoque/insumos/${i.id}`} className="text-xs text-vermelho hover:underline">editar</Link></td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-preto/50">Sem insumos. Rode o seed do banco.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
