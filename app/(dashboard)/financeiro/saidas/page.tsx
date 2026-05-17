import Link from "next/link";
import { EyebrowTitle } from "@/components/ui/eyebrow-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { fmtBR, fmtDataBR } from "@/lib/utils";
import { UploadExtrato } from "./upload-extrato";
import { Plus, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaidasPage() {
  const supabase = await createClient();

  const { data: saidas } = await supabase
    .from("saida")
    .select(`id, data, descricao_original, descricao, valor, forma_pagamento,
             categoria:categoria_despesa(nome,grupo),
             fornecedor:fornecedor(apelido,nome)`)
    .is("deleted_at", null)
    .order("data", { ascending: false })
    .limit(40);

  const semCategoria = (saidas ?? []).filter((s: any) => !s.categoria).length;

  return (
    <div className="space-y-8 max-w-6xl">
      <EyebrowTitle eyebrow="// FINANCEIRO" title="Saídas / Despesas" level={1} />

      <Card variant="creme">
        <p className="text-sm">
          Anexa o <strong>PDF do extrato Sicredi</strong> do período. O sistema:
        </p>
        <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-preto/80">
          <li>filtra <strong>só as saídas</strong> (entradas vêm do PDV — §7.13)</li>
          <li>identifica padrões: PIX pago, boleto, cartão, fatura, IOF, juros</li>
          <li>sugere categoria pelo fornecedor já cadastrado</li>
          <li>tenta vincular pagamento de boleto a NF em aberto</li>
          <li>te mostra a lista pra confirmar antes de gravar</li>
        </ul>
      </Card>

      <UploadExtrato />

      <section>
        <div className="flex items-end justify-between gap-4 mb-3">
          <EyebrowTitle eyebrow={`// ${(saidas ?? []).length} ÚLTIMOS`} title="Movimentações" level={3} />
          <div className="flex gap-2">
            <Link href="/financeiro/categorias">
              <Button variant="creme">Categorias</Button>
            </Link>
            <Link href="/financeiro/fornecedores">
              <Button variant="creme">Fornecedores</Button>
            </Link>
            <Link href="/financeiro/saidas/nova">
              <Button variant="vermelho"><Plus size={16} /> Manual</Button>
            </Link>
          </div>
        </div>

        {semCategoria > 0 && (
          <Card variant="amarelo" className="mb-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle size={16} />
              <strong>{semCategoria}</strong> saída(s) sem categoria — aparece(m) no painel de lacunas
            </div>
          </Card>
        )}

        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-[family-name:var(--font-mono)] text-preto/60 uppercase bg-creme-claro">
              <tr>
                <th className="px-3 py-2 text-left w-24">Data</th>
                <th className="px-3 py-2 text-left">Descrição</th>
                <th className="px-3 py-2 text-left w-40">Categoria</th>
                <th className="px-3 py-2 text-right w-32">Valor</th>
                <th className="px-3 py-2 text-left w-24">Forma</th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {(saidas ?? []).map((s: any) => (
                <tr key={s.id} className="border-t border-preto/5 hover:bg-amarelo/10">
                  <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-xs">{fmtDataBR(s.data)}</td>
                  <td className="px-3 py-2 truncate max-w-md">
                    <div>{s.descricao ?? s.descricao_original}</div>
                    {s.fornecedor && (
                      <div className="text-xs text-preto/50">{s.fornecedor.apelido ?? s.fornecedor.nome}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {s.categoria
                      ? <span className="bg-preto text-amarelo px-2 py-0.5 rounded font-[family-name:var(--font-mono)]">{s.categoria.nome}</span>
                      : <span className="text-vermelho text-xs">faltando</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-subtitulo)] text-vermelho">
                    {fmtBR(s.valor)}
                  </td>
                  <td className="px-3 py-2 text-xs text-preto/60">{s.forma_pagamento ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/financeiro/saidas/${s.id}`} className="text-xs text-vermelho hover:underline">
                      editar
                    </Link>
                  </td>
                </tr>
              ))}
              {(saidas ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-preto/50 text-sm">Nada por aqui ainda. Suba um extrato.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
