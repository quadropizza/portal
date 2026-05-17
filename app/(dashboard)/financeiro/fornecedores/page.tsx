import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fornecedor")
    .select("id, nome, apelido, cnpj, ativo, categoria_padrao:categoria_despesa!fornecedor_categoria_fk(nome)")
    .is("deleted_at", null)
    .order("nome");
  const lista = (data ?? []) as any[];
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between gap-3">
        <EyebrowTitle eyebrow={`// ${lista.length} FORNECEDORES`} title="Fornecedores" level={1} />
        <Link href="/financeiro/fornecedores/novo"><Button variant="vermelho"><Plus size={16} /> Novo</Button></Link>
      </div>
      {lista.length === 0 && (
        <Card variant="creme">
          <p className="text-sm">
            Cadastre fornecedores pra o sistema sugerir categoria automática nas saídas.
            Pode cadastrar conforme aparecerem no extrato.
          </p>
        </Card>
      )}
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
            <tr>
              <th className="px-4 py-2 text-left">Apelido</th>
              <th className="px-4 py-2 text-left">Razão social</th>
              <th className="px-4 py-2 text-left w-40">CNPJ</th>
              <th className="px-4 py-2 text-left">Categoria padrão</th>
              <th className="px-4 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} className="border-t border-preto/5 hover:bg-amarelo/10">
                <td className="px-4 py-2 font-[family-name:var(--font-subtitulo)]">{f.apelido ?? "—"}</td>
                <td className="px-4 py-2">{f.nome}</td>
                <td className="px-4 py-2 font-[family-name:var(--font-mono)] text-xs">{f.cnpj ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{f.categoria_padrao?.nome ?? <span className="text-vermelho">—</span>}</td>
                <td className="px-4 py-2"><Link href={`/financeiro/fornecedores/${f.id}`} className="text-xs text-vermelho hover:underline">editar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
