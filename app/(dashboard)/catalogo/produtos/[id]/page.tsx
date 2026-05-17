import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { ProdutoForm } from "../produto-form";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: produto } = await supabase
    .from("produto")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!produto) notFound();

  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// EDITAR" title={(produto as { nome: string }).nome} level={1} />
      <ProdutoForm modo="editar" produto={produto as Parameters<typeof ProdutoForm>[0]["produto"]} />
    </div>
  );
}
