"use client";

import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell,
} from "recharts";
import { fmtBR } from "@/lib/utils";

const CORES = {
  vermelho: "#D32027", amarelo: "#FFC528", verde: "#2E7D32",
  laranja: "#E8742C", preto: "#1A1410", creme: "#F2E8D5",
};

function TipBR({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-bruto bg-white text-sm px-3 py-2">
      <div className="font-[family-name:var(--font-subtitulo)] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="font-[family-name:var(--font-mono)] text-xs">
          {p.name}: <strong>{typeof p.value === "number" ? fmtBR(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function GraficosDre({ data }: { data: Array<{ label: string; receita: number; cmv: number; despesas: number; pro_labore: number; lucro_op: number; lucro_socio: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CORES.preto} opacity={0.1} />
        <XAxis dataKey="label" stroke={CORES.preto} fontSize={11} />
        <YAxis stroke={CORES.preto} fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
        <Tooltip content={<TipBR />} />
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-mono)" }} />
        <Bar dataKey="receita" name="Receita" fill={CORES.verde} stroke={CORES.preto} strokeWidth={1.5} />
        <Bar dataKey="cmv" name="CMV" fill={CORES.laranja} stroke={CORES.preto} strokeWidth={1.5} />
        <Bar dataKey="despesas" name="Despesas op." fill={CORES.amarelo} stroke={CORES.preto} strokeWidth={1.5} />
        <Bar dataKey="pro_labore" name="Pró-labore" fill={CORES.vermelho} stroke={CORES.preto} strokeWidth={1.5} />
        <Line type="monotone" dataKey="lucro_socio" name="Lucro sócio" stroke={CORES.preto} strokeWidth={3} dot={{ fill: CORES.amarelo, stroke: CORES.preto, strokeWidth: 2, r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
