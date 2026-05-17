"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { cn, fmtBR } from "@/lib/utils";
import { toggleStatus, deletarItem } from "./actions";

type Item = {
  id: string;
  titulo: string;
  descricao: string | null;
  acao_pratica: string | null;
  impacto_estimado_reais: number | null;
  impacto_descricao: string | null;
  severidade: "urgente" | "medio" | "controle" | "positivo";
  status: "pendente" | "em_andamento" | "concluido" | "arquivado";
  categoria_plano: "insight" | "organizacao" | "manual";
  trigger_regra: string | null;
  prazo: string | null;
};

const corPorSeveridade = {
  urgente:  "border-l-vermelho",
  medio:    "border-l-amarelo-escuro",
  controle: "border-l-preto/30",
  positivo: "border-l-verde",
};

export function ItemPlanoEditavel({ item }: { item: Item }) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const concluido = item.status === "concluido";

  function toggle() {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("novo_status", concluido ? "pendente" : "concluido");
    startTransition(() => { toggleStatus(fd); });
  }

  function apagar() {
    if (!confirm(`Apagar "${item.titulo}"?`)) return;
    const fd = new FormData();
    fd.set("id", item.id);
    startTransition(() => { deletarItem(fd); });
  }

  const temDetalhe = item.descricao || item.acao_pratica || item.impacto_estimado_reais;

  return (
    <div className={cn(
      "card-bruto border-l-[6px] transition-opacity",
      corPorSeveridade[item.severidade],
      concluido && "opacity-50",
      pending && "opacity-40",
    )}>
      <div className="flex items-start gap-3">
        <button
          onClick={toggle}
          disabled={pending}
          className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
          title={concluido ? "Reabrir" : "Marcar como concluído"}
        >
          {concluido
            ? <CheckCircle2 size={22} className="text-verde" />
            : <Circle size={22} className="text-preto/40" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={cn(
                "font-[family-name:var(--font-subtitulo)]",
                concluido && "line-through",
              )}>
                {item.titulo}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-[family-name:var(--font-mono)] text-preto/60">
                {item.trigger_regra && (
                  <span className="bg-preto text-amarelo px-1.5 py-0.5 rounded">
                    {item.trigger_regra}
                  </span>
                )}
                {item.prazo && (
                  <span>
                    📅 até {new Date(item.prazo).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                  </span>
                )}
                {item.impacto_estimado_reais != null && item.impacto_estimado_reais !== 0 && (
                  <span>💰 ~{fmtBR(Math.abs(item.impacto_estimado_reais))}/mês</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {temDetalhe && (
                <button
                  onClick={() => setAberto(!aberto)}
                  className="text-preto/40 hover:text-preto p-1"
                  title="Expandir"
                >
                  {aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              <button
                onClick={apagar}
                disabled={pending}
                className="text-preto/40 hover:text-vermelho p-1"
                title="Apagar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {aberto && temDetalhe && (
            <div className="mt-3 space-y-2 text-sm border-t-2 border-dashed border-preto/10 pt-3">
              {item.descricao && (
                <p className="text-preto/80">{item.descricao}</p>
              )}
              {item.acao_pratica && (
                <div>
                  <div className="eyebrow mb-0.5">Ação prática</div>
                  <p className="text-preto/80">{item.acao_pratica}</p>
                </div>
              )}
              {item.impacto_descricao && item.impacto_estimado_reais != null && (
                <div className="bg-creme-claro -mx-2 px-3 py-2 rounded-md text-xs">
                  <strong>Impacto:</strong> ~{fmtBR(Math.abs(item.impacto_estimado_reais))} {item.impacto_descricao}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
