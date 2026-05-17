"use client";

import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { fmtBR } from "@/lib/utils";

const CORES = {
  vermelho: "#D32027",
  amarelo:  "#FFC528",
  creme:    "#F2E8D5",
  preto:    "#1A1410",
  verde:    "#2E7D32",
  laranja:  "#E8742C",
};

const dowNomes = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// Tooltip estilizado
function TipBR({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-bruto bg-white text-sm px-3 py-2 shadow-bruto">
      <div className="font-[family-name:var(--font-subtitulo)] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="font-[family-name:var(--font-mono)] text-xs">
          {p.name}: <strong>{typeof p.value === "number" ? fmtBR(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------
// Faturamento diário
// ----------------------------------------------------------------
export function GraficoDiario({ data }: { data: Array<{ data: string; faturamento: number; qtd_vendas: number }> }) {
  const formatted = data.map((d) => ({
    ...d,
    dia: new Date(d.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke={CORES.preto} opacity={0.1} />
        <XAxis dataKey="dia" stroke={CORES.preto} fontSize={11} />
        <YAxis stroke={CORES.preto} fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
        <Tooltip content={<TipBR />} />
        <Line
          type="monotone" dataKey="faturamento" name="Faturamento"
          stroke={CORES.vermelho} strokeWidth={3}
          dot={{ fill: CORES.amarelo, stroke: CORES.preto, strokeWidth: 2, r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------------------------------
// Por dia da semana (média)
// ----------------------------------------------------------------
export function GraficoDiaSemana({ data }: { data: Array<{ dow: number; media_fat_por_dia: number; dias_operados: number }> }) {
  // Garante ordem seg-sex-sab-dom (pizzaria opera mais durante a semana)
  const ordem = [1,2,3,4,5,6,0];
  const formatted = ordem.map((dow) => {
    const d = data.find((x) => x.dow === dow);
    return { nome: dowNomes[dow], media: d?.media_fat_por_dia ?? 0, dias: d?.dias_operados ?? 0 };
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke={CORES.preto} opacity={0.1} />
        <XAxis dataKey="nome" stroke={CORES.preto} fontSize={11} />
        <YAxis stroke={CORES.preto} fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(1)}k`} />
        <Tooltip content={<TipBR />} />
        <Bar dataKey="media" name="Média por dia" fill={CORES.amarelo} stroke={CORES.preto} strokeWidth={2} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------------------------------
// Por hora — destaca o pico em vermelho
// ----------------------------------------------------------------
export function GraficoHora({ data }: { data: Array<{ hora: number; faturamento: number; qtd_vendas: number }> }) {
  const formatted = data.map((d) => ({ ...d, label: `${String(d.hora).padStart(2,"0")}h` }));
  const max = Math.max(...formatted.map((d) => d.faturamento), 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke={CORES.preto} opacity={0.1} />
        <XAxis dataKey="label" stroke={CORES.preto} fontSize={10} />
        <YAxis stroke={CORES.preto} fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
        <Tooltip content={<TipBR />} />
        <Bar dataKey="faturamento" name="Faturamento" stroke={CORES.preto} strokeWidth={2}>
          {formatted.map((d, i) => (
            <Cell key={i} fill={d.faturamento === max ? CORES.vermelho : d.faturamento > max * 0.6 ? CORES.laranja : CORES.amarelo} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------------------------------
// Forma de pagamento (pizza)
// ----------------------------------------------------------------
const CORES_PAG: Record<string, string> = {
  "PIX":               CORES.verde,
  "Cartão de débito":  CORES.vermelho,
  "Cartão de crédito": CORES.laranja,
  "Dinheiro":          CORES.amarelo,
  "Voucher":           "#9C27B0",
  "Outros":            "#757575",
};

export function GraficoPagamento({ data }: { data: Array<{ forma: string; faturamento: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="faturamento"
          nameKey="forma"
          cx="50%" cy="50%"
          innerRadius={50}
          outerRadius={95}
          stroke={CORES.preto}
          strokeWidth={2}
          label={(e: any) => `${e.forma} ${(e.percent * 100).toFixed(0)}%`}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={CORES_PAG[d.forma] ?? "#757575"} />
          ))}
        </Pie>
        <Tooltip content={<TipBR />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------------------------------
// Top produtos (horizontal bar)
// ----------------------------------------------------------------
export function GraficoProdutos({ data }: { data: Array<{ produto_codigo_origem: string; nome: string; categoria: string | null; qtd_total: number; fat_total: number }> }) {
  const formatted = data.slice(0, 15).map((d) => ({
    nome: d.nome.length > 25 ? d.nome.slice(0, 25) + "…" : d.nome,
    fat: d.fat_total,
    qtd: d.qtd_total,
    cat: d.categoria,
  }));
  const corPorCat = (cat: string | null | undefined) =>
    cat === "pizza_grande" ? CORES.vermelho :
    cat === "pizza_mini"   ? CORES.laranja :
    cat === "bebida"       ? CORES.amarelo : "#757575";

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, formatted.length * 25)}>
      <BarChart data={formatted} layout="vertical" margin={{ left: 20, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CORES.preto} opacity={0.1} />
        <XAxis type="number" stroke={CORES.preto} fontSize={10} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="nome" stroke={CORES.preto} fontSize={11} width={180} />
        <Tooltip content={<TipBR />} />
        <Bar dataKey="fat" name="Faturamento" stroke={CORES.preto} strokeWidth={1.5}>
          {formatted.map((d, i) => <Cell key={i} fill={corPorCat(d.cat)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
