import { EyebrowTitle } from "@/components/ui/eyebrow-title";

export function EmConstrucao({ titulo, fase }: { titulo: string; fase: string }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <EyebrowTitle eyebrow="// EM CONSTRUÇÃO" title={titulo} level={1} />
      <div className="card-bruto bg-amarelo">
        <p className="text-sm">
          Essa tela faz parte da <strong>{fase}</strong> do roadmap (§9 do CLAUDE.md).
          Volte logo.
        </p>
      </div>
    </div>
  );
}
