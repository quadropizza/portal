import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { InsumoForm } from "../insumo-form";

export default function NovoInsumoPage() {
  return (
    <div className="space-y-6 max-w-xl">
      <EyebrowTitle eyebrow="// NOVO" title="Cadastrar insumo" level={1} />
      <InsumoForm modo="novo" />
    </div>
  );
}
