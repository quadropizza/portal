"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check } from "lucide-react";
import { sugerirSaidaParaNf, vincularSaidaANf } from "./actions";
import { fmtBR, fmtDataBR } from "@/lib/utils";

export function SugerirSaidaNf({ nfId }: { nfId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sugestao, setSugestao] = useState<Awaited<ReturnType<typeof sugerirSaidaParaNf>> | null>(null);
  const [estado, setEstado] = useState<"idle" | "buscando" | "achou" | "naoachou">("idle");

  function buscar() {
    setEstado("buscando");
    startTransition(async () => {
      const s = await sugerirSaidaParaNf(nfId);
      if (s.saida_id) { setSugestao(s); setEstado("achou"); }
      else { setEstado("naoachou"); }
    });
  }

  function aceitar() {
    if (!sugestao?.saida_id) return;
    const fd = new FormData();
    fd.set("nf_id", nfId); fd.set("saida_id", sugestao.saida_id);
    startTransition(async () => { await vincularSaidaANf(fd); router.refresh(); });
  }

  if (estado === "idle") {
    return (
      <button onClick={buscar} className="text-xs flex items-center gap-1 text-vermelho hover:underline">
        <Sparkles size={10} /> sugerir saída
      </button>
    );
  }
  if (estado === "buscando") return <span className="text-xs text-preto/50">buscando...</span>;
  if (estado === "naoachou") return <span className="text-xs text-preto/50">sem match no extrato</span>;
  return (
    <div className="text-xs flex items-center gap-1.5">
      <span className="bg-amarelo border-2 border-preto px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)]">
        {fmtBR(Number(sugestao!.saida_valor))} · {fmtDataBR(sugestao!.saida_data!)}
      </span>
      <button onClick={aceitar} disabled={pending}
        className="bg-verde text-white px-2 py-0.5 rounded text-xs font-[family-name:var(--font-subtitulo)] flex items-center gap-0.5">
        <Check size={10} /> aceitar
      </button>
    </div>
  );
}
