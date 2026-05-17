"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { salvarFornecedor, deletarFornecedor } from "./actions";
import { Trash2 } from "lucide-react";

type Cat = { id: string; nome: string };
type Fornecedor = { id: string; nome: string; apelido: string | null; cnpj: string | null; categoria_padrao_id: string | null; ativo: boolean };

export function FornecedorForm({ modo, fornecedor, categorias }: { modo: "novo" | "editar"; fornecedor?: Fornecedor; categorias: Cat[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState(fornecedor?.nome ?? "");
  const [apelido, setApelido] = useState(fornecedor?.apelido ?? "");
  const [cnpj, setCnpj] = useState(fornecedor?.cnpj ?? "");
  const [categoria, setCategoria] = useState(fornecedor?.categoria_padrao_id ?? "");
  const [ativo, setAtivo] = useState(fornecedor?.ativo ?? true);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData();
    if (fornecedor) fd.set("id", fornecedor.id);
    fd.set("nome", nome); fd.set("apelido", apelido); fd.set("cnpj", cnpj);
    fd.set("categoria_id", categoria); fd.set("ativo", ativo ? "1" : "0");
    startTransition(async () => {
      const r = await salvarFornecedor(fd);
      if (r.ok) router.push("/financeiro/fornecedores"); else setErro(r.erro ?? "erro");
    });
  }

  async function apagar() {
    if (!fornecedor) return;
    if (!confirm("Apagar fornecedor?")) return;
    const fd = new FormData(); fd.set("id", fornecedor.id);
    startTransition(async () => { await deletarFornecedor(fd); router.push("/financeiro/fornecedores"); });
  }

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow block mb-1">Apelido</label>
            <input value={apelido} onChange={(e) => setApelido(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" placeholder="ex: Copal" />
          </div>
          <div>
            <label className="eyebrow block mb-1">CNPJ</label>
            <input value={cnpj} onChange={(e) => setCnpj(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" placeholder="00.000.000/0000-00" />
          </div>
        </div>
        <div>
          <label className="eyebrow block mb-1">Razão social</label>
          <input required value={nome} onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro" />
        </div>
        <div>
          <label className="eyebrow block mb-1">Categoria padrão (pra sugestão automática nas saídas)</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
            <option value="">—</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo
        </label>
        {erro && <div className="bg-vermelho text-white border-3 border-preto rounded-xl px-4 py-3 text-sm">{erro}</div>}
        <div className="flex items-center justify-between gap-3 pt-3 border-t-2 border-preto/10">
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} variant="vermelho">{pending ? "Salvando..." : "Salvar"}</Button>
            <Button type="button" onClick={() => router.back()} variant="creme">Cancelar</Button>
          </div>
          {fornecedor && (
            <button type="button" onClick={apagar} className="text-sm text-preto/40 hover:text-vermelho flex items-center gap-1">
              <Trash2 size={14} /> Apagar
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
