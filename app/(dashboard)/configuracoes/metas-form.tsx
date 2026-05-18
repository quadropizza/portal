"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { salvarMetas } from "./actions";

export function MetasForm({ empresa }: { empresa: any }) {
  const m = empresa.metas ?? {};
  const [pending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);
  const [cmv, setCmv] = useState((m.cmv_maximo_pct ?? 35).toString());
  const [despesas, setDespesas] = useState((m.despesas_maximo_pct ?? 60).toString());
  const [ticket, setTicket] = useState((m.ticket_medio_meta ?? 28).toString());
  const [retirada, setRetirada] = useState((m.pro_labore_max_pct_receita ?? 25).toString());
  const [validade, setValidade] = useState((m.validade_pizza_pronta_dias ?? 10).toString());

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("empresa_id", empresa.id);
    fd.set("cmv_maximo_pct", cmv);
    fd.set("despesas_maximo_pct", despesas);
    fd.set("ticket_medio_meta", ticket);
    fd.set("pro_labore_max_pct_receita", retirada);
    fd.set("validade_pizza_pronta_dias", validade);
    startTransition(async () => {
      await salvarMetas(fd);
      setSalvo(true); setTimeout(() => setSalvo(false), 2000);
    });
  }

  return (
    <Card>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="CMV máximo (%)" value={cmv} set={setCmv} hint="Acima dispara R001" />
          <Field label="Despesas op. máximo (%)" value={despesas} set={setDespesas} />
          <Field label="Ticket médio meta (R$)" value={ticket} set={setTicket} hint="Abaixo dispara R005" />
          <Field label="Retirada sócios máx (%)" value={retirada} set={setRetirada} hint="Acima dispara R002" />
          <Field label="Validade pizza pronta (dias)" value={validade} set={setValidade} />
        </div>
        <div className="flex items-center gap-3 pt-3 border-t-2 border-preto/10">
          <Button type="submit" disabled={pending} variant="vermelho">{pending ? "..." : "Salvar metas"}</Button>
          {salvo && <span className="text-verde flex items-center gap-1 text-sm"><CheckCircle2 size={14} /> Salvo</span>}
        </div>
      </form>
    </Card>
  );
}

function Field({ label, value, set, hint }: { label: string; value: string; set: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="eyebrow block mb-1">{label}</label>
      <input type="number" step="0.01" value={value} onChange={(e) => set(e.target.value)}
        className="w-full px-3 py-2 border-3 border-preto rounded-lg bg-creme-claro font-[family-name:var(--font-mono)]" />
      {hint && <div className="text-[10px] text-preto/50 mt-0.5 font-[family-name:var(--font-mono)]">{hint}</div>}
    </div>
  );
}
