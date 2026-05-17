import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtDataBR } from "@/lib/utils";
import { UploadExtrato } from "./upload-extrato";
import { SaidaRow } from "./saida-row";
import { Plus, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaidasPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const hoje = new Date();
  // Default: pega TUDO do ano (abril em diante)
  const inicioAno = `${hoje.getFullYear()}-01-01`;
  const de = sp.de ?? inicioAno;
  const ate = sp.ate ?? hoje.toISOString().split("T")[0];

  let q = supabase
    .from("saida")
    .select(`id, data, descricao_original, descricao, valor, categoria_id, forma_pagamento,
             categoria:categoria_despesa(id,nome,grupo),
             fornecedor:fornecedor(id,apelido,nome)`)
    .is("deleted_at", null)
    .gte("data", de)
    .lte("data", ate)
    .order("data", { ascending: false })
    .limit(500);
  if (sp.cat) q = q.eq("categoria_id", sp.cat);

  const { data: saidas } = await q;
  const { data: cats } = await supabase.from("categoria_despesa").select("id, nome, grupo").eq("ativa", true).order("ordem");

  const lista = (saidas ?? []) as any[];
  const total = lista.reduce((s, x) => s + Number(x.valor), 0);
  const semCategoria = lista.filter((s) => !s.categoria).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <EyebrowTitle eyebrow="// FINANCEIRO" title="Saídas / Despesas" level={1} />

      <UploadExtrato />

      {/* Filtro */}
      <Card>
        <form className="flex items-end gap-3 flex-wrap text-sm">
          <div>
            <label className="eyebrow block mb-1">De</label>
            <input type="date" name="de" defaultValue={de} className="px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Até</label>
            <input type="date" name="ate" defaultValue={ate} className="px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Categoria</label>
            <select name="cat" defaultValue={sp.cat ?? ""} className="px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro">
              <option value="">— todas —</option>
              {((cats ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <button className="btn-bruto btn-vermelho" type="submit">filtrar</button>
          <div className="flex gap-1 ml-auto">
            <Link href="/financeiro/saidas/nova"><Button variant="vermelho"><Plus size={14} /> Manual</Button></Link>
            <Link href="/financeiro/fornecedores"><Button variant="creme">Fornecedores</Button></Link>
          </div>
        </form>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><div className="eyebrow">Total no período</div><div className="text-2xl font-[family-name:var(--font-titulo)] text-vermelho">{fmtBR(total)}</div></Card>
        <Card><div className="eyebrow">Lançamentos</div><div className="text-2xl font-[family-name:var(--font-titulo)]">{lista.length}</div></Card>
        <Card className={semCategoria > 0 ? "border-vermelho border-[3px]" : ""}>
          <div className="eyebrow">Sem categoria</div>
          <div className={`text-2xl font-[family-name:var(--font-titulo)] ${semCategoria > 0 ? "text-vermelho" : "text-verde"}`}>{semCategoria}</div>
        </Card>
      </div>

      {/* Lista com inline edit de categoria */}
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
            <tr>
              <th className="px-3 py-2 text-left w-24">Data</th>
              <th className="px-3 py-2 text-left">Descrição</th>
              <th className="px-3 py-2 text-left w-52">Categoria</th>
              <th className="px-3 py-2 text-right w-28">Valor</th>
              <th className="px-3 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => (
              <SaidaRow key={s.id} saida={s} categorias={(cats ?? []) as any} />
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-preto/50 text-sm">Nada no período.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
