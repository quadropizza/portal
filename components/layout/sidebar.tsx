"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingBag, Package, Wallet, FileText,
  BarChart3, CheckSquare, Settings, Pizza,
} from "lucide-react";

// Sidebar simplificada — 8 itens principais.
// Sub-navegação fica dentro de cada hub (Vendas, Estoque, Financeiro, Catálogo).
const items = [
  { href: "/visao-geral",        nome: "Visão geral",  icon: LayoutDashboard, match: "/visao-geral" },
  { href: "/vendas/dia",         nome: "Vendas",       icon: ShoppingBag,     match: "/vendas" },
  { href: "/estoque/insumos",    nome: "Estoque",      icon: Package,         match: "/estoque/insumos" },
  { href: "/estoque/producao",   nome: "Produção",     icon: Pizza,           match: "/estoque/producao" },
  { href: "/estoque/contagem-pizza", nome: "Contar pizzas", icon: Pizza,      match: "/estoque/contagem" },
  { href: "/financeiro/saidas",  nome: "Financeiro",   icon: Wallet,          match: "/financeiro" },
  { href: "/notas-fiscais",      nome: "NFs / Contas", icon: FileText,        match: "/notas-fiscais" },
  { href: "/dre",                nome: "DRE",          icon: BarChart3,       match: "/dre" },
  { href: "/plano-de-acao",      nome: "Plano",        icon: CheckSquare,     match: "/plano-de-acao" },
  { href: "/catalogo/produtos",  nome: "Catálogo",     icon: Pizza,           match: "/catalogo" },
  { href: "/configuracoes",      nome: "Configurações", icon: Settings,       match: "/configuracoes" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-preto text-creme border-r-4 border-preto flex flex-col">
      <div className="p-4 border-b-4 border-amarelo bg-vermelho">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amarelo border-3 border-preto rounded-lg flex items-center justify-center shrink-0">
            <span className="text-2xl">🍕</span>
          </div>
          <div>
            <div className="text-xl font-[family-name:var(--font-titulo)] leading-none text-amarelo">QUADRÔ</div>
            <div className="text-[10px] font-[family-name:var(--font-mono)] text-creme/70">portal · gestão</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-3">
        {items.map((it) => {
          const active = pathname.startsWith(it.match);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm font-[family-name:var(--font-subtitulo)] transition-colors",
                active ? "bg-amarelo text-preto" : "text-creme/80 hover:bg-vermelho-escuro hover:text-white",
              )}
            >
              <Icon size={18} />
              {it.nome}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t-4 border-amarelo text-[10px] font-[family-name:var(--font-mono)] text-creme/50">
        Quadrô Pizza · Itajaí
      </div>
    </aside>
  );
}
