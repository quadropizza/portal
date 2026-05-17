"use client";

import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { fmtBR } from "@/lib/utils";

const CORES = { vermelho: "#D32027", amarelo: "#FFC528", verde: "#2E7D32", laranja: "#E8742C", preto: "#1A1410" };
const dowNomes = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const mesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-bruto bg-white text-xs px-3 py-2">
      <div className="font-[family-name:var(--font-subtitulo)] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="font-[family-name:var(--font-mono)]">
          {p.name}: <strong>{typeof p.value === "number" ? fmtBR(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function GraficosAnalise({ dow, horas, dreHist, mesAtual, anoAtual }: { dow: any[]; horas: any[]; dreHist: any[]; mesAtual: number; anoAtual: number }) {
  const dowData = [1,2,3,4,5,6,0].map((d) => {
    const r = dow.find((x: any) => x.dow === d);
    return { nome: dowNomes[d], media: Number(r?.media_fat_por_dia ?? 0), ticket: Number(r?.ticket_medio ?? 0) };
  });

  const horaData = horas.map((h: any) => ({ hora: `${String(h.hora).padStart(2,"0")}h`, fat: Number(h.faturamento) }));
  const maxHora = Math.max(...horaData.map((h) => h.fat), 0);

  const histData = dreHist.slice(-6).map((h: any) => ({
    label: `${mesAbrev[h.mes-1]}/${String(h.ano).slice(-2)}`,
    margem_op: h.receita_bruta > 0 ? Number(h.lucro_operacional) / Number(h.receita_bruta) * 100 : 0,
    margem_socio: h.receita_bruta > 0 ? Number(h.lucro_socio) / Number(h.receita_bruta) * 100 : 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-2">Faturamento médio por dia da semana</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dowData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CORES.preto} opacity={0.1} />
            <XAxis dataKey="nome" stroke={CORES.preto} fontSize={11} />
            <YAxis stroke={CORES.preto} fontSize={10} tickFormatter={(v) => `R$${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="media" name="Faturamento médio" fill={CORES.amarelo} stroke={CORES.preto} strokeWidth={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="eyebrow mb-2">Distribuição por horário</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={horaData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CORES.preto} opacity={0.1} />
            <XAxis dataKey="hora" stroke={CORES.preto} fontSize={10} />
            <YAxis stroke={CORES.preto} fontSize={10} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="fat" name="Faturamento" stroke={CORES.preto} strokeWidth={2}>
              {horaData.map((d, i) => (
                <Cell key={i} fill={d.fat === maxHora ? CORES.vermelho : d.fat > maxHora * 0.6 ? CORES.laranja : CORES.amarelo} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {histData.length > 1 && (
        <div>
          <div className="eyebrow mb-2">Evolução de margem operacional vs líquida (últimos 6 meses)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={histData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CORES.preto} opacity={0.1} />
              <XAxis dataKey="label" stroke={CORES.preto} fontSize={11} />
              <YAxis stroke={CORES.preto} fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip content={<Tip />} formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
              <Line type="monotone" dataKey="margem_op" name="Margem op." stroke={CORES.amarelo} strokeWidth={3} dot={{ fill: CORES.amarelo, stroke: CORES.preto, strokeWidth: 2, r: 4 }} />
              <Line type="monotone" dataKey="margem_socio" name="Margem sócio" stroke={CORES.vermelho} strokeWidth={3} dot={{ fill: CORES.vermelho, stroke: CORES.preto, strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
