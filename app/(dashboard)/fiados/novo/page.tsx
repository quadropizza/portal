import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { FiadoForm } from "../fiado-form";
import { createClient } from "@/lib/supabase/server";

export default async function NovoFiadoPage() {
  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produto")
    .select("id, codigo, nome, categoria, preco_venda")
    .eq("ativo", true)
    .is("deleted_at", null)
    .order("categoria").order("codigo");

  return (
    <div className="space-y-6 max-w-3xl">
      <EyebrowTitle eyebrow="// NOVA" title="Abrir comanda fiado" level={1} />
      <Card variant="creme">
        <p className="text-sm">
          Cadastra cliente, adiciona pizzas e bebidas. Estoque baixa automaticamente.
          Quando fechar, abre o WhatsApp com o resumo pronto pra mandar pro cliente.
        </p>
      </Card>
      <FiadoForm produtos={(produtos ?? []) as any} />
    </div>
  );
}
