"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle2, X } from "lucide-react";
import { salvarCategoria, deletarCategoria } from "./actions";

type Categoria = { id: string; nome: string; grupo: string; ativa: boolean };

const GRUPOS = [
  { v: "cmv", l: "CMV", desc: "Custo da Mercadoria Vendida (insumos, bebidas, embalagem)" },
  { v: "folha", l: "Folha", desc: "Salários, encargos, bonificações dos funcionários" },
  { v: "impostos", l: "Impostos", desc: "Simples Nacional, DAS, ICMS, PIS, COFINS" },
  { v: "aluguel", l: "Aluguel", desc: "Aluguel da loja, sala, condomínio" },
  { v: "bancarias", l: "Bancárias", desc: "Financiamento, empréstimo, juros, tarifa, fatura" },
  { v: "outros", l: "Outras op.", desc: "Energia, telefone, software, administradora, diversos" },
  { v: "pro_labore_lucas", l: "Pró-labore Lucas", desc: "Retirada do sócio Lucas" },
  { v: "pro_labore_alessandra", l: "Pró-labore Alessandra", desc: "Retirada da sócia Alessandra" },
];

const rotuloGrupo: Record<string, string> = Object.fromEntries(GRUPOS.map((g) => [g.v, g.l]));

export function CategoriasManager({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState("outros");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) { setErro("Nome obrigatório"); return; }
    const fd = new FormData();
    fd.set("nome", nome); fd.set("grupo", grupo);
    startTransition(async () => {
      const r = await salvarCategoria(fd);
      if (r.ok) {
        setNome(""); setGrupo("outros"); setSalvo(true);
        setTimeout(() => setSalvo(false), 1500);
        router.refresh();
      } else {
        setErro(r.erro ?? "erro");
      }
    });
  }

  function apagar(id: string, nome: string) {
    if (!confirm(`Apagar categoria "${nome}"? As saídas ligadas ficam sem categoria.`)) return;
    const fd = new FormData(); fd.set("id", id);
    startTransition(async () => { await deletarCategoria(fd); router.refresh(); });
  }

  // Agrupar por grupo
  const porGrupo = categorias.reduce<Record<string, Categoria[]>>((acc, c) => {
    (acc[c.grupo] ||= []).push(c); return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Formulário criar */}
      <Card>
        <div className="eyebrow mb-3">// CRIAR NOVA</div>
        <form onSubmit={criar} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="eyebrow block mb-1">Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)}
                className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro"
                placeholder="ex: Marketing, Manutenção, Limpeza" />
            </div>
            <div>
              <label className="eyebrow block mb-1">Grupo (DRE)</label>
              <select value={grupo} onChange={(e) => setGrupo(e.target.value)}
                className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
                {GRUPOS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
              </select>
              <div className="text-[11px] text-preto/60 mt-1 font-[family-name:var(--font-mono)]">
                {GRUPOS.find((g) => g.v === grupo)?.desc}
              </div>
            </div>
          </div>
          {erro && <div className="text-vermelho text-sm flex items-center gap-2"><X size={14} /> {erro}</div>}
          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={pending || !nome.trim()} variant="vermelho">
              <Plus size={14} /> {pending ? "Criando..." : "Criar categoria"}
            </Button>
            {salvo && <span className="text-verde flex items-center gap-1 text-sm"><CheckCircle2 size={14} /> Criada!</span>}
          </div>
        </form>
      </Card>

      {/* Lista agrupada */}
      {GRUPOS.map((g) => {
        const items = porGrupo[g.v];
        if (!items?.length) return null;
        return (
          <section key={g.v}>
            <div className="eyebrow mb-2">// {g.l.toUpperCase()} · {items.length}</div>
            <Card className="p-0">
              <ul>
                {items.map((c) => (
                  <li key={c.id} className="px-4 py-2 border-t border-preto/5 first:border-t-0 flex items-center justify-between text-sm">
                    <span>{c.nome}</span>
                    <button onClick={() => apagar(c.id, c.nome)} disabled={pending}
                      className="text-preto/30 hover:text-vermelho" title="Apagar">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
