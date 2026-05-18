import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Pizza, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VisaoAtendentePage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <header className="rounded-2xl border-3 border-preto bg-amarelo p-5 md:p-8">
        <div className="eyebrow">// ATENDENTE</div>
        <h1 className="text-2xl md:text-5xl font-[family-name:var(--font-titulo)] leading-none mt-1">
          Olá, Gabriela 👋
        </h1>
        <p className="text-sm mt-3">
          Suas tarefas: <strong>contar pizzas no fim do dia</strong> e
          <strong> abrir comandas</strong> quando tiver fiado.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3">
        <Link href="/estoque/contagem-pizza" className="card-bruto bg-vermelho text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1A1410] transition-transform block">
          <div className="flex items-center gap-4">
            <Pizza size={36} className="text-amarelo shrink-0" />
            <div>
              <div className="text-xl md:text-2xl font-[family-name:var(--font-titulo)]">Contar pizzas</div>
              <div className="text-xs md:text-sm mt-1 opacity-80">Conta no fim do dia o que tem na geladeira</div>
            </div>
          </div>
        </Link>

        <Link href="/fiados" className="card-bruto bg-preto text-amarelo active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1A1410] transition-transform block">
          <div className="flex items-center gap-4">
            <ClipboardList size={36} className="shrink-0" />
            <div>
              <div className="text-xl md:text-2xl font-[family-name:var(--font-titulo)]">Comandas (fiado)</div>
              <div className="text-xs md:text-sm mt-1 opacity-80">Anota cliente, fecha e manda no WhatsApp</div>
            </div>
          </div>
        </Link>
      </div>

      <Card variant="creme">
        <div className="text-xs font-[family-name:var(--font-mono)] text-preto/60">
          Dúvidas? Fala com Lucas ou Ale.
        </div>
      </Card>
    </div>
  );
}
