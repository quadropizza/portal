import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { FornecedorForm } from "../fornecedor-form";
import { createClient } from "@/lib/supabase/server";

export default async function NovoFornecedorPage() {
  const supabase = await createClient();
  const { data: cats } = await supabase.from("categoria_despesa").select("id,nome").eq("ativa", true).order("ordem");
  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// NOVO" title="Cadastrar fornecedor" level={1} />
      <FornecedorForm modo="novo" categorias={(cats ?? []) as any} />
    </div>
  );
}
