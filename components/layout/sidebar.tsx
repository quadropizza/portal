"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingBag, Package, Wallet, FileText,
  BarChart3, CheckSquare, Settings, Pizza, ClipboardList, TrendingUp,
  Menu, X,
} from "lucide-react";

const itemsDono = [
  { href: "/visao-geral",                nome: "Visão geral",       icon: LayoutDashboard, match: "/visao-geral" },
  { href: "/analise",                    nome: "Análise",           icon: TrendingUp,      match: "/analise" },
  { href: "/vendas/dia",                 nome: "Vendas",            icon: ShoppingBag,     match: "/vendas" },
  { href: "/estoque/insumos",            nome: "Insumos",           icon: Package,         match: "/estoque/insumos" },
  { href: "/estoque/insumos/movimentar", nome: "Lançar insumos",    icon: Package,         match: "/estoque/insumos/movimentar" },
  { href: "/estoque/bebidas",            nome: "Bebidas",           icon: Package,         match: "/estoque/bebidas" },
  { href: "/estoque/producao",           nome: "Produção",          icon: Pizza,           match: "/estoque/producao" },
  { href: "/estoque/contagem-pizza",     nome: "Contar pizzas",     icon: Pizza,           match: "/estoque/contagem" },
  { href: "/estoque/fechamento",         nome: "Fechamento estoque", icon: BarChart3,      match: "/estoque/fechamento" },
  { href: "/fiados",                     nome: "Fiados",            icon: ClipboardList,   match: "/fiados" },
  { href: "/financeiro/saidas",          nome: "Financeiro",        icon: Wallet,          match: "/financeiro/saidas" },
  { href: "/financeiro/custos-fixos",    nome: "Custos fixos",      icon: Wallet,          match: "/financeiro/custos-fixos" },
  { href: "/financeiro/categorias",      nome: "Categorias",        icon: Wallet,          match: "/financeiro/categorias" },
  { href: "/financeiro/fornecedores",    nome: "Fornecedores",      icon: Wallet,          match: "/financeiro/fornecedores" },
  { href: "/notas-fiscais",              nome: "NFs / Contas",      icon: FileText,        match: "/notas-fiscais" },
  { href: "/dre",                        nome: "DRE",               icon: BarChart3,       match: "/dre" },
  { href: "/plano-de-acao",              nome: "Plano",             icon: CheckSquare,     match: "/plano-de-acao" },
  { href: "/catalogo/produtos",          nome: "Catálogo",          icon: Pizza,           match: "/catalogo" },
  { href: "/configuracoes",              nome: "Configurações",     icon: Settings,        match: "/configuracoes" },
];

const itemsAtendente = [
  { href: "/visao-atendente",        nome: "Início",        icon: LayoutDashboard, match: "/visao-atendente" },
  { href: "/estoque/contagem-pizza", nome: "Contar pizzas", icon: Pizza,           match: "/estoque/contagem" },
  { href: "/fiados",                 nome: "Comandas",      icon: ClipboardList,   match: "/fiados" },
];

export function Sidebar({ perfil = "dono" }: { perfil?: string }) {
  const pathname = usePathname();
  const items = perfil === "atendente" ? itemsAtendente : itemsDono;
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* Botão hamburger fixo no mobile */}
      <button
        onClick={() => setAberto(true)}
        className="md:hidden fixed top-3 left-3 z-40 bg-preto text-amarelo border-2 border-amarelo p-2 rounded-lg shadow-bruto"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Overlay quando aberto */}
      {aberto && (
        <div className="md:hidden fixed inset-0 bg-preto/60 z-40" onClick={() => setAberto(false)} />
      )}

      <aside className={cn(
        "bg-preto text-creme border-r-4 border-preto flex flex-col z-50",
        "md:w-56 md:static md:flex",
        "fixed inset-y-0 left-0 w-64 transition-transform",
        aberto ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}>
        <div className="p-4 border-b-4 border-amarelo bg-creme-claro flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Quadrô" className="w-full max-w-[160px] h-auto" />
          <button
            onClick={() => setAberto(false)}
            className="md:hidden text-preto/40 hover:text-vermelho ml-2"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
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
                onClick={() => setAberto(false)}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 text-sm font-[family-name:var(--font-subtitulo)] transition-colors",
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
    </>
  );
}
