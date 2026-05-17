import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { SaidaForm } from "../saida-form";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditarSaidaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [saida, cats, forns] = await Promise.all([
    supabase.from("saida").select("*").eq("id", id).maybeSingle(),
    supabase.from("categoria_despesa").select("id,nome,grupo").eq("ativa", true).order("ordem"),
    supabase.from("fornecedor").select("id,nome,apelido").eq("ativo", true).order("nome"),
  ]);
  if (!saida.data) notFound();
  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// EDITAR" title="Saída" level={1} />
      <SaidaForm modo="editar" saida={saida.data as any} categorias={(cats.data ?? []) as any} fornecedores={(forns.data ?? []) as any} />
    </div>
  );
}
