"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { salvarObrigacaoManual, deletarObrigacao, pagarObrigacao } from "./actions";
import { Trash2, CheckCircle2 } from "lucide-react";
import { fmtBR } from "@/lib/utils";

type Forn = { id: string; nome: string; apelido: string | null };
type Cat = { id: string; nome: string; grupo: string };
type Obrigacao = {
  id: string; tipo: string; fornecedor_id: string | null;
  categoria_id: string | null; numero: string | null;
  data_vencimento: string; valor_total: number; valor_pago: number;
  status: string; competencia: string | null;
};

export function ObrigacaoForm({
  modo, obrigacao, fornecedores, categorias,
}: {
  modo: "novo" | "editar"; obrigacao?: Obrigacao; fornecedores: Forn[]; categorias: Cat[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [tipo, setTipo] = useState(obrigacao?.tipo ?? "boleto_avulso");
  const [fornecedor, setFornecedor] = useState(obrigacao?.fornecedor_id ?? "");
  const [categoria, setCategoria] = useState(obrigacao?.categoria_id ?? "");
  const [numero, setNumero] = useState(obrigacao?.numero ?? "");
  const [vencimento, setVencimento] = useState(obrigacao?.data_vencimento ?? new Date().toISOString().split("T")[0]);
  const [valor, setValor] = useState(obrigacao?.valor_total?.toString() ?? "");
  const [competencia, setCompetencia] = useState(obrigacao?.competencia ?? "");

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (obrigacao) fd.set("id", obrigacao.id);
    fd.set("tipo", tipo); fd.set("fornecedor_id", fornecedor); fd.set("categoria_id", categoria);
    fd.set("numero", numero); fd.set("vencimento", vencimento); fd.set("valor", valor); fd.set("competencia", competencia);
    startTransition(async () => {
      await salvarObrigacaoManual(fd);
      router.push("/notas-fiscais");
    });
  }

  async function apagar() {
    if (!obrigacao || !confirm("Apagar?")) return;
    const fd = new FormData(); fd.set("id", obrigacao.id);
    startTransition(async () => { await deletarObrigacao(fd); router.push("/notas-fiscais"); });
  }

  function pagar(forma: string) {
    if (!obrigacao) return;
    if (!confirm(`Confirmar pagamento de ${fmtBR(obrigacao.valor_total - obrigacao.valor_pago)} via ${forma}? Vai gerar uma saída automática categorizada.`)) return;
    const fd = new FormData();
    fd.set("id", obrigacao.id); fd.set("forma", forma);
    startTransition(async () => {
      const r = await pagarObrigacao(fd);
      if (r.ok) router.refresh();
      else alert(r.erro);
    });
  }

  const restante = obrigacao ? Number(obrigacao.valor_total) - Number(obrigacao.valor_pago) : 0;
  const aberto = obrigacao?.status === "em_aberto" || obrigacao?.status === "parcialmente_pago";

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="eyebrow block mb-1">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
            <option value="nf_fornecedor">NF fornecedor</option>
            <option value="boleto_avulso">Boleto avulso</option>
            <option value="tributo">Tributo (DARF, GPS, Simples)</option>
            <option value="encargo_trabalhista">Encargo trabalhista (FGTS)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow block mb-1">Vencimento</label>
            <input type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Valor (R$)</label>
            <input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
        </div>
        <div>
          <label className="eyebrow block mb-1">Fornecedor (opcional)</label>
          <select value={fornecedor} onChange={(e) => setFornecedor(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
            <option value="">—</option>
            {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.apelido ?? f.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="eyebrow block mb-1">Categoria (pra DRE e pagamento)</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
            className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
            <option value="">— escolher —</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow block mb-1">Número</label>
            <input value={numero} onChange={(e) => setNumero(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Competência</label>
            <input value={competencia} onChange={(e) => setCompetencia(e.target.value)}
              className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" placeholder="04/2026" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t-2 border-preto/10">
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} variant="vermelho">{pending ? "..." : "Salvar"}</Button>
            <Button type="button" onClick={() => router.back()} variant="creme">Cancelar</Button>
          </div>
          {obrigacao && <button type="button" onClick={apagar} className="text-sm text-preto/40 hover:text-vermelho flex items-center gap-1"><Trash2 size={14} /> Apagar</button>}
        </div>
      </form>

      {obrigacao && aberto && (
        <div className="mt-6 pt-4 border-t-4 border-preto">
          <div className="eyebrow mb-2">// PAGAR</div>
          <p className="text-sm mb-3">
            Restante a pagar: <strong className="text-vermelho">{fmtBR(restante)}</strong>
          </p>
          {!categoria && <p className="text-xs text-vermelho mb-2">⚠️ Salve com categoria antes de pagar.</p>}
          <div className="flex gap-2 flex-wrap">
            <Button type="button" onClick={() => pagar("pix")} disabled={pending || !categoria} variant="vermelho">
              <CheckCircle2 size={14} /> Pago via PIX
            </Button>
            <Button type="button" onClick={() => pagar("debito")} disabled={pending || !categoria} variant="creme">Débito</Button>
            <Button type="button" onClick={() => pagar("boleto")} disabled={pending || !categoria} variant="creme">Boleto</Button>
            <Button type="button" onClick={() => pagar("dinheiro")} disabled={pending || !categoria} variant="creme">Dinheiro</Button>
          </div>
          <p className="text-xs text-preto/60 mt-3 font-[family-name:var(--font-mono)]">
            Gera saída na categoria escolhida e marca obrigação como paga.
          </p>
        </div>
      )}
    </Card>
  );
}
