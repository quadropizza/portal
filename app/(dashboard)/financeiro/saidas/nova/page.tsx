import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { SaidaForm } from "../saida-form";
import { createClient } from "@/lib/supabase/server";

export default async function NovaSaidaPage() {
  const supabase = await createClient();
  const [cats, forns] = await Promise.all([
    supabase.from("categoria_despesa").select("id,nome,grupo").eq("ativa", true).order("ordem"),
    supabase.from("fornecedor").select("id,nome,apelido").eq("ativo", true).order("nome"),
  ]);
  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// NOVA" title="Lançar saída manual" level={1} />
      <SaidaForm modo="novo" categorias={(cats.data ?? []) as any} fornecedores={(forns.data ?? []) as any} />
    </div>
  );
}
