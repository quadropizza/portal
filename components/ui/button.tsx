import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "amarelo" | "vermelho" | "creme";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = "amarelo", children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "btn-bruto",
        variant === "vermelho" && "btn-vermelho",
        variant === "creme" && "btn-creme",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = "Button";
