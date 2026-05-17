/**
 * Parser do relatório de venda detalhada do Fast Report (PDV Quadrô).
 * Formato documentado em §13.1 do CLAUDE.md.
 *
 * Cada venda é um bloco "VENDA: NNN ... DATA DE EMISSÃO ... PRODUTO ... TIPO DE LANÇAMENTO".
 * Extrai timestamp completo (decisão §12.1 — Fast Report exporta hh:mm:ss).
 */

export type VendaItem = {
  codigo: string;
  nome: string;
  qtd: number;
  total: number;
};

export type VendaParsed = {
  pdv_id: string;
  data_hora: string; // ISO 8601
  total: number;
  forma_pagamento: string;
  items: VendaItem[];
};

export type ParseResult = {
  vendas: VendaParsed[];
  total_blocos: number;
  blocos_falhados: number;
  amostras_falha: string[];
  periodo: { inicio: string | null; fim: string | null };
};

/**
 * Recebe o texto bruto extraído do PDF (via pdf-parse com layout) e retorna
 * vendas estruturadas. Não escreve no banco — quem chama (a action) é que
 * persiste com idempotência (unique constraint em venda_individual).
 */
export function parsePdvText(rawIn: string): ParseResult {
  // Normaliza: junta "VENDA:" + número que aparece em linha separada (pdf2json)
  const raw = rawIn
    .replace(/VENDA:\s*\n+\s*(\d+)/g, "VENDA: $1")
    .replace(/DATA DE EMISS\S+O:\s*\n+\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/g, "DATA DE EMISSÃO: $1");

  // Cada bloco começa em "VENDA: <id>" e vai até a próxima ocorrência
  const blockRe = /VENDA:\s+\d+[\s\S]*?(?=VENDA:\s+\d+|$)/g;
  const blocks = raw.match(blockRe) ?? [];

  const vendas: VendaParsed[] = [];
  const amostrasFalha: string[] = [];

  for (const b of blocks) {
    const idM = b.match(/VENDA:\s+(\d+)/);
    // Aceita "DATA DE EMISSÃO" mesmo com encoding quebrado (Ã substituído)
    const dtM = b.match(
      /DATA DE EMISS\S+O:\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,
    );
    if (!idM || !dtM) {
      if (amostrasFalha.length < 3) amostrasFalha.push(b.slice(0, 200));
      continue;
    }
    const [, dd, mm, yyyy, hh, mi, ss] = dtM;
    const dataHora = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;

    const items = extractItems(b);
    const forma = extractFormaPagamento(b);
    const total = extractTotal(b) ?? items.reduce((s, i) => s + i.total, 0);

    vendas.push({
      pdv_id: idM[1],
      data_hora: dataHora,
      total,
      forma_pagamento: forma,
      items,
    });
  }

  vendas.sort((a, b) => a.data_hora.localeCompare(b.data_hora));

  return {
    vendas,
    total_blocos: blocks.length,
    blocos_falhados: blocks.length - vendas.length,
    amostras_falha: amostrasFalha,
    periodo: {
      inicio: vendas[0]?.data_hora.split("T")[0] ?? null,
      fim: vendas.at(-1)?.data_hora.split("T")[0] ?? null,
    },
  };
}

function extractItems(blockText: string): VendaItem[] {
  const lines = blockText.split(/\r?\n/);
  const out: VendaItem[] = [];

  for (const line of lines) {
    // pular linhas de pagamento
    if (/(CARTAO|DINHEIRO|PIX|VOUCHER|TRANSFER|TIPO DE LAN|TOTAL DOS PAG)/i.test(line)) continue;

    // Padrão: "  COD - NOME PRODUTO    QTD    ...    TOTAL"
    const m = line.match(
      /^\s*(\d+)\s+-\s+([A-Z0-9ÀÁÂÃÄÅÇÉÊËÍÎÏÑÓÔÕÖÚÛÜ \-\/\(\)\.,&'À-ſ�]+?)\s{2,}(\d+)\s+(?:\d+,\d{2}\s+)?\s*([\d.]+,\d{2})\s*$/,
    );
    if (!m) continue;

    const codigo = m[1];
    const nome = m[2].replace(/\s+/g, " ").trim();
    const qtd = parseInt(m[3], 10);
    const total = parseFloat(m[4].replace(/\./g, "").replace(",", "."));

    if (qtd > 0 && total >= 0) {
      out.push({ codigo, nome, qtd, total });
    }
  }
  return out;
}

function extractFormaPagamento(blockText: string): string {
  const m = blockText.match(
    /^\s*\d+\s+-\s+(DINHEIRO|CARTAO DE CREDITO|CARTAO DE DEBITO|PIX|VOUCHER|TRANSFER\S*)/im,
  );
  if (!m) return "Outros";
  const raw = m[1].toUpperCase();
  if (raw.includes("CARTAO DE CREDITO")) return "Cartão de crédito";
  if (raw.includes("CARTAO DE DEBITO")) return "Cartão de débito";
  if (raw.includes("DINHEIRO")) return "Dinheiro";
  if (raw.includes("PIX")) return "PIX";
  if (raw.includes("VOUCHER")) return "Voucher";
  return "Outros";
}

function extractTotal(blockText: string): number | null {
  const m = blockText.match(/\(=\)\s*TOTAL\s*VENDA[\s\S]*?R\$\s*([\d.]+,\d{2})/);
  if (!m) return null;
  return parseFloat(m[1].replace(/\./g, "").replace(",", "."));
}
