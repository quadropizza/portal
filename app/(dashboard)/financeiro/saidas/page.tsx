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
  const { data: proj } = await supabase.from("financeiro_projecao").select("*").maybeSingle();

  const lista = (saidas ?? []) as any[];
  const total = lista.reduce((s, x) => s + Number(x.valor), 0);
  const semCategoria = lista.filter((s) => !s.categoria).length;
  const p: any = proj ?? {};

  return (
    <div className="space-y-6 max-w-6xl">
      <EyebrowTitle eyebrow="// FINANCEIRO" title="Saídas / Despesas" level={1} />

      {/* Projeção mensal */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <div className="eyebrow">Pago no mês</div>
          <div className="text-xl md:text-2xl font-[family-name:var(--font-titulo)] text-vermelho">{fmtBR(Number(p.saidas_pagas_mes ?? 0))}</div>
          <div className="text-[10px] text-preto/50 font-[family-name:var(--font-mono)] mt-1">desde dia 1</div>
        </Card>
        <Card>
          <div className="eyebrow">Mês anterior</div>
          <div className="text-xl md:text-2xl font-[family-name:var(--font-titulo)]">{fmtBR(Number(p.total_mes_anterior ?? 0))}</div>
          <div className="text-[10px] text-preto/50 font-[family-name:var(--font-mono)] mt-1">total fechado</div>
        </Card>
        <Card className={Number(p.custos_fixos_pendente ?? 0) > 0 ? "border-amarelo-escuro border-[3px]" : ""}>
          <div className="eyebrow">Custos fixos pendentes</div>
          <div className="text-xl md:text-2xl font-[family-name:var(--font-titulo)] text-amarelo-escuro">{fmtBR(Number(p.custos_fixos_pendente ?? 0))}</div>
          <div className="text-[10px] text-preto/50 font-[family-name:var(--font-mono)] mt-1">a pagar este mês</div>
        </Card>
        <Card className={Number(p.nfs_pendente ?? 0) > 0 ? "border-vermelho border-[3px]" : ""}>
          <div className="eyebrow">NFs em aberto</div>
          <div className="text-xl md:text-2xl font-[family-name:var(--font-titulo)] text-vermelho">{fmtBR(Number(p.nfs_pendente ?? 0))}</div>
          <div className="text-[10px] text-preto/50 font-[family-name:var(--font-mono)] mt-1">{p.nfs_qtd ?? 0} obrigação(ões)</div>
        </Card>
      </section>

      {/* Card projeção total destacado */}
      <Card variant="amarelo">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="eyebrow">// PROJEÇÃO TOTAL DO MÊS</div>
            <div className="text-3xl md:text-4xl font-[family-name:var(--font-titulo)] mt-1">{fmtBR(Number(p.projecao_total ?? 0))}</div>
            <div className="text-xs mt-1 font-[family-name:var(--font-mono)]">
              pago {fmtBR(Number(p.saidas_pagas_mes ?? 0))} + fixos {fmtBR(Number(p.custos_fixos_pendente ?? 0))} + NFs {fmtBR(Number(p.nfs_pendente ?? 0))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs eyebrow">vs mês anterior</div>
            {Number(p.total_mes_anterior ?? 0) > 0 && (
              <div className={`text-lg font-[family-name:var(--font-subtitulo)] ${Number(p.projecao_total ?? 0) > Number(p.total_mes_anterior ?? 0) ? "text-vermelho" : "text-verde"}`}>
                {Number(p.projecao_total ?? 0) > Number(p.total_mes_anterior ?? 0) ? "+" : ""}
                {((Number(p.projecao_total ?? 0) - Number(p.total_mes_anterior ?? 0)) / Number(p.total_mes_anterior ?? 1) * 100).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </Card>

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
