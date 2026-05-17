import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { ObrigacaoForm } from "../obrigacao-form";
import { createClient } from "@/lib/supabase/server";

export default async function NovaObrigacaoPage() {
  const supabase = await createClient();
  const { data: forns } = await supabase.from("fornecedor").select("id,nome,apelido").eq("ativo", true).order("nome");
  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// NOVA" title="Cadastrar obrigação a pagar" level={1} />
      <ObrigacaoForm modo="novo" fornecedores={(forns ?? []) as any} />
    </div>
  );
}
