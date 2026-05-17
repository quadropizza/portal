import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { InsumoForm } from "../insumo-form";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditarInsumoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("insumo").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// EDITAR" title={(data as any).nome} level={1} />
      <InsumoForm modo="editar" insumo={data as any} />
    </div>
  );
}
