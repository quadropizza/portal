import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { FornecedorForm } from "../fornecedor-form";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditarFornecedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [f, cats] = await Promise.all([
    supabase.from("fornecedor").select("*").eq("id", id).maybeSingle(),
    supabase.from("categoria_despesa").select("id,nome").eq("ativa", true).order("ordem"),
  ]);
  if (!f.data) notFound();
  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// EDITAR" title={(f.data as any).nome} level={1} />
      <FornecedorForm modo="editar" fornecedor={f.data as any} categorias={(cats.data ?? []) as any} />
    </div>
  );
}
