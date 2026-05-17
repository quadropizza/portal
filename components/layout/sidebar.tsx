"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  TrendingUp,
  Package,
  Scale,
  ClipboardList,
  Wallet,
  Users,
  FileText,
  BarChart3,
  CheckSquare,
  Settings,
  Pizza,
  BookOpen,
} from "lucide-react";

const items = [
  { href: "/visao-geral",                nome: "Visão geral",           icon: LayoutDashboard },
  { href: "/vendas/dia",                 nome: "Vendas · alimentar",    icon: ShoppingBag },
  { href: "/vendas/dashboard",           nome: "Vendas · dashboard",    icon: TrendingUp },
  { href: "/estoque/insumos",            nome: "Estoque · insumos",     icon: Package },
  { href: "/estoque/producao",           nome: "Estoque · produção",    icon: Pizza },
  { href: "/estoque/contagem",           nome: "Estoque · contagem",    icon: Scale },
  { href: "/financeiro/saidas",          nome: "Saídas / despesas",     icon: Wallet },
  { href: "/financeiro/fornecedores",    nome: "Fornecedores",          icon: Users },
  { href: "/notas-fiscais",              nome: "NFs / boletos",         icon: FileText },
  { href: "/dre",                        nome: "DRE",                   icon: BarChart3 },
  { href: "/plano-de-acao",              nome: "Plano de ação",         icon: CheckSquare },
  { href: "/catalogo/produtos",          nome: "Catálogo produtos",     icon: ClipboardList },
  { href: "/catalogo/fichas-tecnicas",   nome: "Fichas técnicas",       icon: BookOpen },
  { href: "/configuracoes",              nome: "Configurações",         icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-preto text-creme border-r-4 border-preto flex flex-col">
      <div className="p-6 border-b-4 border-amarelo">
        <div className="eyebrow text-amarelo mb-1">// PORTAL</div>
        <div className="text-2xl font-[family-name:var(--font-titulo)] leading-none text-amarelo">
          QUADRÔ
        </div>
        <div className="text-xs mt-1 font-[family-name:var(--font-mono)] text-creme/60">
          gestão · v0.1
        </div>
      </div>
      <nav className="flex-1 py-4">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm font-[family-name:var(--font-subtitulo)] transition-colors",
                active
                  ? "bg-amarelo text-preto"
                  : "text-creme/80 hover:bg-vermelho-escuro hover:text-white",
              )}
            >
              <Icon size={18} />
              {it.nome}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t-4 border-amarelo text-xs font-[family-name:var(--font-mono)] text-creme/60">
        Quadrô Pizza<br />
        Itajaí · SC
      </div>
    </aside>
  );
}
