import { cn } from "@/lib/utils";

/**
 * Título de bloco no padrão "// 01 · BLOCO" (eyebrow Space Mono +
 * título grande em Bowlby/Archivo). Padrão do protótipo da Fase 0.
 */
export function EyebrowTitle({
  eyebrow,
  title,
  className,
  level = 2,
}: {
  eyebrow: string;
  title: string;
  className?: string;
  level?: 1 | 2 | 3;
}) {
  const Tag = (`h${level}` as keyof React.JSX.IntrinsicElements);
  const titleClass = level === 1
    ? "text-4xl md:text-6xl font-[family-name:var(--font-titulo)] leading-[0.95]"
    : level === 2
    ? "text-2xl md:text-4xl font-[family-name:var(--font-titulo)] leading-tight"
    : "text-xl md:text-2xl font-[family-name:var(--font-subtitulo)] leading-tight";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="eyebrow">{eyebrow}</div>
      <Tag className={titleClass}>{title}</Tag>
    </div>
  );
}
