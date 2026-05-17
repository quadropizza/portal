import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { ProdutoForm } from "../produto-form";

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string; categoria?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// NOVO" title="Cadastrar produto" level={1} />
      <ProdutoForm modo="novo" codigoSugerido={sp.codigo ?? ""} categoriaSugerida={sp.categoria} />
    </div>
  );
}
