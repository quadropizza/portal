import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { FichaForm } from "../ficha-form";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditarFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [prodR, insumosR, fichaR] = await Promise.all([
    supabase.from("produto").select("id, codigo, nome").eq("id", id).maybeSingle(),
    supabase.from("insumo").select("id, nome, unidade_padrao, custo_medio_atual").eq("ativo", true).order("nome"),
    supabase.from("ficha_tecnica")
      .select("id, versao, itens:ficha_tecnica_item(id, insumo_id, quantidade, unidade)")
      .eq("produto_id", id).eq("ativa", true).is("deleted_at", null).maybeSingle(),
  ]);
  if (!prodR.data) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <EyebrowTitle eyebrow="// FICHA TÉCNICA" title={(prodR.data as any).nome} level={1} />
      <FichaForm
        produto={prodR.data as any}
        insumos={(insumosR.data ?? []) as any}
        ficha={fichaR.data as any}
      />
    </div>
  );
}
