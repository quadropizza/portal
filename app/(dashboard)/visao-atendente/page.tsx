import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Pizza, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VisaoAtendentePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <header className="rounded-2xl border-3 border-preto bg-amarelo p-6 md:p-8">
        <div className="eyebrow">// ATENDENTE</div>
        <h1 className="text-3xl md:text-5xl font-[family-name:var(--font-titulo)] leading-none mt-1">
          Olá, Gabriela 👋
        </h1>
        <p className="text-sm mt-3">
          Suas tarefas do dia: <strong>contar pizzas no fim do expediente</strong> e
          <strong> abrir comandas de fiado</strong> quando tiver cliente.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/estoque/contagem-pizza" className="card-bruto bg-vermelho text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1A1410] transition-transform block">
          <Pizza size={40} className="mb-3 text-amarelo" />
          <div className="text-2xl font-[family-name:var(--font-titulo)]">Contar pizzas</div>
          <div className="text-sm mt-1 opacity-80">No fim do dia, conta quantas pizzas tem na geladeira/freezer.</div>
        </Link>

        <Link href="/fiados" className="card-bruto bg-preto text-amarelo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1A1410] transition-transform block">
          <ClipboardList size={40} className="mb-3" />
          <div className="text-2xl font-[family-name:var(--font-titulo)]">Comandas (fiado)</div>
          <div className="text-sm mt-1 opacity-80">Anota cliente, pizzas e bebidas. Fecha e manda no WhatsApp.</div>
        </Link>
      </div>

      <Card variant="creme">
        <div className="text-xs font-[family-name:var(--font-mono)] text-preto/60">
          Qualquer dúvida sobre o sistema, fala com Lucas ou Ale.
        </div>
      </Card>
    </div>
  );
}
