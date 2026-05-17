"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingBag, Package, Wallet, FileText,
  BarChart3, CheckSquare, Settings, Pizza, ClipboardList, TrendingUp,
} from "lucide-react";

const itemsDono = [
  { href: "/visao-geral",            nome: "Visão geral",  icon: LayoutDashboard, match: "/visao-geral" },
  { href: "/analise",                nome: "Análise",      icon: TrendingUp,      match: "/analise" },
  { href: "/vendas/dia",             nome: "Vendas",       icon: ShoppingBag,     match: "/vendas" },
  { href: "/estoque/insumos",        nome: "Insumos",      icon: Package,         match: "/estoque/insumos" },
  { href: "/estoque/bebidas",        nome: "Bebidas",      icon: Package,         match: "/estoque/bebidas" },
  { href: "/estoque/producao",       nome: "Produção",     icon: Pizza,           match: "/estoque/producao" },
  { href: "/estoque/contagem-pizza", nome: "Contar pizzas", icon: Pizza,          match: "/estoque/contagem" },
  { href: "/estoque/fechamento",     nome: "Fechamento estoque", icon: BarChart3,  match: "/estoque/fechamento" },
  { href: "/fiados",                 nome: "Fiados",       icon: ClipboardList,   match: "/fiados" },
  { href: "/financeiro/saidas",      nome: "Financeiro",   icon: Wallet,          match: "/financeiro/saidas" },
  { href: "/financeiro/categorias",  nome: "Categorias",   icon: Wallet,          match: "/financeiro/categorias" },
  { href: "/financeiro/fornecedores", nome: "Fornecedores", icon: Wallet,         match: "/financeiro/fornecedores" },
  { href: "/notas-fiscais",          nome: "NFs / Contas", icon: FileText,        match: "/notas-fiscais" },
  { href: "/dre",                    nome: "DRE",          icon: BarChart3,       match: "/dre" },
  { href: "/plano-de-acao",          nome: "Plano",        icon: CheckSquare,     match: "/plano-de-acao" },
  { href: "/catalogo/produtos",        nome: "Catálogo",       icon: Pizza,  match: "/catalogo" },
  { href: "/configuracoes",          nome: "Configurações", icon: Settings,       match: "/configuracoes" },
];

const itemsAtendente = [
  { href: "/visao-atendente",        nome: "Início",        icon: LayoutDashboard, match: "/visao-atendente" },
  { href: "/estoque/contagem-pizza", nome: "Contar pizzas", icon: Pizza,           match: "/estoque/contagem" },
  { href: "/fiados",                 nome: "Comandas",      icon: ClipboardList,   match: "/fiados" },
];

export function Sidebar({ perfil = "dono" }: { perfil?: string }) {
  const pathname = usePathname();
  const items = perfil === "atendente" ? itemsAtendente : itemsDono;

  return (
    <aside className="w-56 bg-preto text-creme border-r-4 border-preto flex flex-col">
      <div className="p-4 border-b-4 border-amarelo bg-creme-claro">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Quadrô" className="w-full h-auto" />
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {items.map((it) => {
          const active = pathname.startsWith(it.match);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={it.href as any}
              className={cn(
                "flex items-center gap-3 px-5 py-2 text-sm font-[family-name:var(--font-subtitulo)] transition-colors",
                active ? "bg-amarelo text-preto" : "text-creme/80 hover:bg-vermelho-escuro hover:text-white",
              )}
            >
              <Icon size={16} />
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
