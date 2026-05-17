"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, CheckCircle2, Trash2 } from "lucide-react";
import { fmtBR, fmtDataBR } from "@/lib/utils";
import { adicionarItem, fecharComanda, marcarPaga, deletarFiado } from "./actions";

const PIX_KEY = "60723998000184";

type Fiado = {
  id: string; nome_cliente: string; telefone: string | null; status: "aberto" | "fechado" | "pago";
  data_abertura: string; data_fechamento: string | null; total: number;
};
type Item = { id: string; quantidade: number; valor_unitario: number; valor_total: number; created_at: string; produto: { id: string; nome: string; categoria: string } };
type Produto = { id: string; codigo: string; nome: string; categoria: string; preco_venda: number };

export function ComandaDetalhe({ fiado, items, produtos }: { fiado: Fiado; items: Item[]; produtos: Produto[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [novoProd, setNovoProd] = useState(produtos[0]?.id ?? "");
  const [novaQtd, setNovaQtd] = useState(1);
  const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,16); };
  const [novaData, setNovaData] = useState(nowLocal());

  function add() {
    if (!novoProd) return;
    const fd = new FormData();
    fd.set("fiado_id", fiado.id); fd.set("produto_id", novoProd); fd.set("quantidade", String(novaQtd));
    fd.set("data_consumo", novaData);
    startTransition(async () => { await adicionarItem(fd); setNovaQtd(1); setNovaData(nowLocal()); router.refresh(); });
  }

  function fechar() {
    const fd = new FormData(); fd.set("id", fiado.id);
    startTransition(async () => {
      await fecharComanda(fd);
      // Abre WhatsApp depois do fechamento
      if (fiado.telefone) {
        const msg = buildMensagem();
        const tel = fiado.telefone.replace(/\D/g, "");
        const tel55 = tel.startsWith("55") ? tel : `55${tel}`;
        window.open(`https://wa.me/${tel55}?text=${encodeURIComponent(msg)}`, "_blank");
      }
      router.refresh();
    });
  }

  function pagar(forma: string) {
    const fd = new FormData(); fd.set("id", fiado.id); fd.set("forma", forma);
    startTransition(async () => { await marcarPaga(fd); router.refresh(); });
  }

  function apagar() {
    if (!confirm(`Apagar comanda de ${fiado.nome_cliente}? Itens já consumidos NÃO voltam ao estoque.`)) return;
    const fd = new FormData(); fd.set("id", fiado.id);
    startTransition(async () => { await deletarFiado(fd); router.push("/fiados"); });
  }

  function buildMensagem(): string {
    const linhas = items.map((i) => `${i.quantidade}x ${i.produto.nome} ······ ${fmtBR(i.valor_total)}`).join("\n");
    return `*Quadrô Pizza · Fechamento*\n\nOlá ${fiado.nome_cliente}, segue o resumo da sua comanda:\n\n${linhas}\n\n*Total: ${fmtBR(fiado.total)}*\n\nPra pagar via PIX:\nCNPJ: ${PIX_KEY}\nQuadrô Pizza\n\nObrigado! 🍕`;
  }

  function whatsappLink() {
    if (!fiado.telefone) return null;
    const msg = buildMensagem();
    const tel = fiado.telefone.replace(/\D/g, "");
    const tel55 = tel.startsWith("55") ? tel : `55${tel}`;
    return `https://wa.me/${tel55}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="eyebrow">Aberta em</div>
            <div className="text-sm font-[family-name:var(--font-mono)]">{fmtDataBR(fiado.data_abertura)}</div>
            {fiado.telefone && (
              <>
                <div className="eyebrow mt-2">Telefone</div>
                <div className="text-sm font-[family-name:var(--font-mono)]">{fiado.telefone}</div>
              </>
            )}
          </div>
          <div className="text-right">
            <div className="eyebrow">Total</div>
            <div className="text-4xl font-[family-name:var(--font-titulo)] text-vermelho">{fmtBR(fiado.total)}</div>
            <div className="text-xs text-preto/60 mt-1">
              {fiado.status === "aberto" && <span className="text-amarelo-escuro">⏱ aberta</span>}
              {fiado.status === "fechado" && <span className="text-laranja">📤 fechada · aguardando pagamento</span>}
              {fiado.status === "pago" && <span className="text-verde">✓ paga</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* Itens */}
      <Card>
        <div className="eyebrow mb-2">// ITENS · {items.length}</div>
        <ul className="divide-y divide-preto/10">
          {items.map((i) => {
            const hora = new Date(i.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            return (
              <li key={i.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="w-8 text-center font-[family-name:var(--font-mono)] font-bold">{i.quantidade}×</span>
                <span className="flex-1">
                  {i.produto.nome}
                  <span className="text-[10px] text-preto/40 font-[family-name:var(--font-mono)] ml-2">{hora}</span>
                </span>
                <span className="text-xs text-preto/50 font-[family-name:var(--font-mono)]">{fmtBR(i.valor_unitario)}</span>
                <span className="w-24 text-right font-[family-name:var(--font-subtitulo)]">{fmtBR(i.valor_total)}</span>
              </li>
            );
          })}
        </ul>

        {fiado.status === "aberto" && (
          <div className="mt-3 pt-3 border-t-2 border-preto/10 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <select value={novoProd} onChange={(e) => setNovoProd(e.target.value)}
                className="flex-1 min-w-[200px] px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-sm">
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} ({fmtBR(p.preco_venda)})</option>)}
              </select>
              <input type="number" min="1" value={novaQtd} onChange={(e) => setNovaQtd(Number(e.target.value))}
                className="w-16 px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-right font-[family-name:var(--font-mono)]" />
              <input type="datetime-local" value={novaData} onChange={(e) => setNovaData(e.target.value)}
                className="px-2 py-1.5 border-2 border-preto rounded bg-creme-claro text-xs font-[family-name:var(--font-mono)]" />
              <button type="button" onClick={add} disabled={pending} className="btn-bruto"><Plus size={14} /> add</button>
            </div>
            <div className="text-[10px] text-preto/50 font-[family-name:var(--font-mono)]">data/hora do consumo · ajusta se foi antes</div>
          </div>
        )}
      </Card>

      {/* Ações */}
      <Card variant="creme">
        <div className="flex items-center gap-2 flex-wrap">
          {fiado.status === "aberto" && (
            <Button onClick={fechar} disabled={pending} variant="vermelho">
              <MessageCircle size={14} /> Fechar e enviar WhatsApp
            </Button>
          )}
          {fiado.status === "fechado" && (
            <>
              <Button onClick={() => pagar("pix")} disabled={pending} variant="vermelho">
                <CheckCircle2 size={14} /> Pago PIX
              </Button>
              <Button onClick={() => pagar("debito")} disabled={pending} variant="creme">Débito</Button>
              <Button onClick={() => pagar("credito")} disabled={pending} variant="creme">Crédito</Button>
              <Button onClick={() => pagar("dinheiro")} disabled={pending} variant="creme">Dinheiro</Button>
              {whatsappLink() && (
                <a href={whatsappLink()!} target="_blank" rel="noreferrer" className="btn-bruto btn-creme">
                  <MessageCircle size={14} /> Reenviar
                </a>
              )}
            </>
          )}
          <div className="ml-auto">
            <button onClick={apagar} className="text-xs text-preto/40 hover:text-vermelho flex items-center gap-1">
              <Trash2 size={12} /> apagar
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs font-[family-name:var(--font-mono)] text-preto/60">
          PIX da Quadrô: <strong>{PIX_KEY}</strong> (CNPJ)
        </div>
      </Card>
    </div>
  );
}
