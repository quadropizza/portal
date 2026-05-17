/**
 * Parser do extrato bancário Sicredi (PDF).
 * Decisão §7.13 do CLAUDE.md: extrai SÓ saídas. Entradas vêm do PDV.
 * Decisão §7.18: OFX indisponível, só PDF — tolerar quebras de layout.
 *
 * Cada linha do extrato tem o padrão:
 *   dd/mm/yyyy DESCRIÇÃO BLA  [DOCUMENTO]  VALOR  SALDO
 *
 * Valores positivos = entrada (ignorar). Valores negativos = saída.
 * Algumas linhas têm sinal negativo no valor, outras só o sinal vem
 * por contexto. Pra ser conservador: filtramos por padrão de descrição.
 */

const PADROES_SAIDA = [
  /^PAGAMENTO\s+PIX/i,
  /^COMPRAS\s+NACIONAIS/i,
  /^LIQUIDACAO\s+BOLETO/i,
  /^DEB\.?\s*CTA\.?\s*FATURA/i,
  /^IOF/i,
  /^JUROS/i,
  /^ENC\.?\s*FIN\./i,
  /^TARIFA/i,
  /^CESTA\s+DE\s+RELACIONAMENTO/i,
  /^SEGURO/i,
  /^INTEGR(ALIZ)?\.?\s*CAPITAL/i,
  /^DEBITO\s+AUTOMATICO/i,
];

export type SaidaParsed = {
  data: string;               // YYYY-MM-DD
  descricao_original: string; // como veio
  valor: number;              // sempre positivo (magnitude)
  cnpj_extraido: string | null;
  nome_extraido: string | null;
  tipo_movimento: string;     // categoria bruta (PAGAMENTO PIX, COMPRAS NACIONAIS, etc)
};

export type ExtratoResult = {
  saidas: SaidaParsed[];
  periodo: { inicio: string | null; fim: string | null };
  saldo_anterior: number | null;
  total_linhas: number;
  total_saidas_valor: number;
  amostras_ignoradas: string[];
};

export function parseExtratoSicredi(raw: string): ExtratoResult {
  const lines = raw.split(/\r?\n/);
  const saidas: SaidaParsed[] = [];
  const datas: string[] = [];
  let saldoAnterior: number | null = null;
  const ignoradas: string[] = [];

  // padrão de início de linha de movimento: dd/mm/yyyy
  const dataRe = /^(\d{2})\/(\d{2})\/(\d{4})\s+(.+)/;

  // saldo anterior aparece no topo, ex: "SALDO ANTERIOR ... 1.626,03"
  const saldoAntRe = /SALDO\s+ANTERIOR.*?([\d.]+,\d{2})/i;
  for (const l of lines) {
    const m = l.match(saldoAntRe);
    if (m) { saldoAnterior = parseValor(m[1]); break; }
  }

  for (const line of lines) {
    const m = line.match(dataRe);
    if (!m) continue;
    const [, dd, mm, yyyy, resto] = m;
    const data = `${yyyy}-${mm}-${dd}`;

    // Tenta identificar o tipo
    const isSaida = PADROES_SAIDA.some((p) => p.test(resto));
    if (!isSaida) {
      if (ignoradas.length < 3 && resto.length > 20) ignoradas.push(line.slice(0, 100));
      continue;
    }

    // Tenta extrair o valor — pode aparecer como "-1.973,00" ou "1.973,00"
    // junto ao saldo "91,66". Heurística: o último número da linha é o saldo,
    // o penúltimo (se houver) é o valor.
    const numeros = [...resto.matchAll(/-?[\d.]+,\d{2}/g)].map((x) => parseValor(x[0]));
    if (numeros.length === 0) continue;

    // Caso padrão: penúltimo número (com sinal) é o valor da movimentação
    let valor: number;
    if (numeros.length >= 2) {
      valor = numeros[numeros.length - 2];
    } else {
      valor = numeros[0];
    }

    // Saída tem que ser negativa OU vir com sinal positivo mas padrão claro
    // (alguns parsings perdem o sinal "-"). Considera sempre magnitude.
    valor = Math.abs(valor);
    if (valor === 0) continue;

    // Limpa descrição: tira valores numéricos da string pra ficar só o texto
    let descricao = resto.replace(/-?[\d.]+,\d{2}/g, "").trim();
    descricao = descricao.replace(/\s{2,}/g, " ").trim();

    const cnpjM = descricao.match(/(\d{14})/);
    const cnpj = cnpjM ? cnpjM[1] : null;

    // Extrai nome após o CNPJ ou após o tipo (PAGAMENTO PIX <CPF> <NOME>)
    let nome: string | null = null;
    const nomeM = descricao.match(/(?:PAGAMENTO PIX|LIQUIDACAO BOLETO)\s+\d+\s+(.+)/i);
    if (nomeM) nome = nomeM[1].trim();
    else {
      const cnRe = descricao.match(/COMPRAS NACIONAIS\s+([A-Z0-9 ]+?)(?:\s+[A-Z]{2}|\s*$)/i);
      if (cnRe) nome = cnRe[1].trim();
    }

    // Tipo bruto
    let tipo = "Outro";
    if (/PAGAMENTO PIX/i.test(resto)) tipo = "PIX enviado";
    else if (/LIQUIDACAO BOLETO/i.test(resto)) tipo = "Boleto";
    else if (/COMPRAS NACIONAIS/i.test(resto)) tipo = "Cartão";
    else if (/DEB\.?\s*CTA\.?\s*FATURA/i.test(resto)) tipo = "Fatura débito conta";
    else if (/IOF/i.test(resto)) tipo = "IOF";
    else if (/JUROS|ENC\.?\s*FIN\./i.test(resto)) tipo = "Juros";
    else if (/TARIFA|CESTA/i.test(resto)) tipo = "Tarifa";
    else if (/SEGURO/i.test(resto)) tipo = "Seguro";
    else if (/INTEGR.*CAPITAL/i.test(resto)) tipo = "Capital";

    saidas.push({
      data,
      descricao_original: resto.trim().slice(0, 200),
      valor,
      cnpj_extraido: cnpj,
      nome_extraido: nome,
      tipo_movimento: tipo,
    });
    datas.push(data);
  }

  datas.sort();
  const totalLinhas = lines.filter((l) => dataRe.test(l)).length;
  const totalValor = saidas.reduce((s, x) => s + x.valor, 0);

  return {
    saidas,
    periodo: { inicio: datas[0] ?? null, fim: datas.at(-1) ?? null },
    saldo_anterior: saldoAnterior,
    total_linhas: totalLinhas,
    total_saidas_valor: totalValor,
    amostras_ignoradas: ignoradas,
  };
}

function parseValor(s: string): number {
  const neg = s.startsWith("-");
  const limpo = s.replace(/-/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return neg ? -n : n;
}
