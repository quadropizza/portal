import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { ObrigacaoForm } from "../obrigacao-form";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditarObrigacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [o, forns] = await Promise.all([
    supabase.from("obrigacao_a_pagar").select("*").eq("id", id).maybeSingle(),
    supabase.from("fornecedor").select("id,nome,apelido").eq("ativo", true).order("nome"),
  ]);
  if (!o.data) notFound();
  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// EDITAR" title={`Obrigação ${(o.data as any).numero ?? ""}`} level={1} />
      <ObrigacaoForm modo="editar" obrigacao={o.data as any} fornecedores={(forns.data ?? []) as any} />
    </div>
  );
}
