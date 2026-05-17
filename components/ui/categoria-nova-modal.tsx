"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { criarCategoria } from "@/app/(dashboard)/financeiro/saidas/actions";

const GRUPOS = [
  { v: "cmv", l: "CMV (insumos)" },
  { v: "folha", l: "Folha (atendentes)" },
  { v: "impostos", l: "Impostos" },
  { v: "aluguel", l: "Aluguel" },
  { v: "bancarias", l: "Bancárias" },
  { v: "outros", l: "Outras op." },
  { v: "pro_labore_lucas", l: "Pró-labore Lucas" },
  { v: "pro_labore_alessandra", l: "Pró-labore Alessandra" },
];

export function CategoriaNovaModal({ aberto, fechar, onCriada }: { aberto: boolean; fechar: () => void; onCriada: (id: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState("outros");
  const [erro, setErro] = useState<string | null>(null);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) return;
    const fd = new FormData(); fd.set("nome", nome); fd.set("grupo", grupo);
    startTransition(async () => {
      const r = await criarCategoria(fd);
      if (r.ok && r.id) {
        onCriada(r.id);
        setNome(""); setGrupo("outros");
        fechar();
      } else {
        setErro(r.erro ?? "erro");
      }
    });
  }

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 bg-preto/60 flex items-center justify-center p-4" onClick={fechar}>
      <div className="bg-white border-4 border-preto rounded-2xl p-6 max-w-md w-full shadow-bruto-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="font-[family-name:var(--font-titulo)] text-2xl">Nova categoria</div>
          <button onClick={fechar} className="text-preto/40 hover:text-vermelho"><X size={20} /></button>
        </div>
        <form onSubmit={salvar} className="space-y-3">
          <div>
            <label className="eyebrow block mb-1">Nome</label>
            <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro"
              placeholder="ex: Marketing" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Grupo (entra na DRE como)</label>
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
              {GRUPOS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
            </select>
          </div>
          {erro && <div className="text-vermelho text-sm">{erro}</div>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending || !nome.trim()} variant="vermelho">
              {pending ? "Criando..." : "Criar categoria"}
            </Button>
            <Button type="button" onClick={fechar} variant="creme">Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
