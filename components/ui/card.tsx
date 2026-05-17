import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "amarelo" | "vermelho" | "creme";
}) {
  const bg = variant === "amarelo"  ? "bg-amarelo"
           : variant === "vermelho" ? "bg-vermelho text-white"
           : variant === "creme"    ? "bg-creme-claro"
           :                          "bg-white";
  return (
    <div className={cn("card-bruto", bg, className)}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  valor,
  hint,
  destaque = "preto",
}: {
  label: string;
  valor: string;
  hint?: string;
  destaque?: "preto" | "verde" | "vermelho" | "amarelo";
}) {
  const color = destaque === "verde"    ? "text-verde"
              : destaque === "vermelho" ? "text-vermelho"
              : destaque === "amarelo"  ? "text-amarelo-escuro"
              :                           "text-preto";
  return (
    <Card>
      <div className="eyebrow mb-2">{label}</div>
      <div className={cn("text-3xl font-[family-name:var(--font-titulo)] leading-none", color)}>
        {valor}
      </div>
      {hint && <div className="text-xs mt-2 text-preto/60 font-[family-name:var(--font-mono)]">{hint}</div>}
    </Card>
  );
}
