"use client";

import {
  ResponsiveContainer, ComposedChart, Bar, Line, PieChart, Pie, Cell, LineChart,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { fmtBR, fmtPct } from "@/lib/utils";

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

export function GraficosDre({ data }: { data: Array<any> }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CORES.preto} opacity={0.1} />
        <XAxis dataKey="label" stroke={CORES.preto} fontSize={11} />
        <YAxis stroke={CORES.preto} fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
        <Tooltip content={<TipBR />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="receita" name="Receita" fill={CORES.verde} stroke={CORES.preto} strokeWidth={1.5} />
        <Bar dataKey="cmv" name="CMV" fill={CORES.laranja} stroke={CORES.preto} strokeWidth={1.5} />
        <Bar dataKey="despesas" name="Despesas op." fill={CORES.amarelo} stroke={CORES.preto} strokeWidth={1.5} />
        <Bar dataKey="pro_labore" name="Pró-labore" fill={CORES.vermelho} stroke={CORES.preto} strokeWidth={1.5} />
        <Line type="monotone" dataKey="lucro_socio" name="Lucro líquido" stroke={CORES.preto} strokeWidth={3} dot={{ fill: CORES.amarelo, stroke: CORES.preto, strokeWidth: 2, r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GraficoComposicaoDespesas({ data }: { data: Array<{ nome: string; cor: string; valor: number }> }) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valor"
          nameKey="nome"
          cx="50%" cy="50%"
          innerRadius={50}
          outerRadius={95}
          stroke={CORES.preto}
          strokeWidth={2}
          label={(e: any) => `${e.nome} ${((e.value/total)*100).toFixed(0)}%`}
        >
          {data.map((d, i) => <Cell key={i} fill={d.cor} />)}
        </Pie>
        <Tooltip content={<TipBR />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GraficoLucros({ data }: { data: Array<{ label: string; margem_bruta: number; margem_op: number; margem_socio: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CORES.preto} opacity={0.1} />
        <XAxis dataKey="label" stroke={CORES.preto} fontSize={11} />
        <YAxis stroke={CORES.preto} fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}%`} />
        <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} content={<TipBR />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="margem_bruta" name="Bruta" stroke={CORES.verde} strokeWidth={3} dot={{ fill: CORES.verde, r: 3 }} />
        <Line type="monotone" dataKey="margem_op" name="Operacional" stroke={CORES.amarelo} strokeWidth={3} dot={{ fill: CORES.amarelo, r: 3 }} />
        <Line type="monotone" dataKey="margem_socio" name="Líquida" stroke={CORES.vermelho} strokeWidth={3} dot={{ fill: CORES.vermelho, r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
