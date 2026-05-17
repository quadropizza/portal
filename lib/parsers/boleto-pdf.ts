/**
 * Parser de boleto bancário (PDF com texto extraível via pdf2json).
 * Extrai valor, vencimento, número, beneficiário, CNPJ.
 */

export type BoletoData = {
  valor?: number;
  vencimento?: string; // YYYY-MM-DD
  numero?: string;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
  linha_digitavel?: string;
};

function parseDateBR(s: string): string | undefined {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

function parseValor(s: string): number | undefined {
  const m = s.match(/R\$\s*([\d.]+,\d{2})/i) ?? s.match(/([\d.]+,\d{2})/);
  if (!m) return undefined;
  return parseFloat(m[1].replace(/\./g, "").replace(",", "."));
}

export function parseBoletoPdf(texto: string): BoletoData {
  const out: BoletoData = {};

  // Vencimento (próximo a "Vencimento")
  const venc = texto.match(/Vencimento[^\n]*?(\d{2}\/\d{2}\/\d{4})/i)
            ?? texto.match(/Pagar até[^\n]*?(\d{2}\/\d{2}\/\d{4})/i);
  if (venc) out.vencimento = parseDateBR(venc[1]);

  // Valor (procura "Valor do Documento" ou "R$ XXX,XX")
  const val = texto.match(/Valor do Documento[^\n]*?R?\$?\s*([\d.]+,\d{2})/i)
           ?? texto.match(/Valor[\s\S]{0,40}R\$\s*([\d.]+,\d{2})/i);
  if (val) out.valor = parseValor(val[1]);

  // CNPJ do beneficiário (primeiro CNPJ que não é do pagador)
  const cnpjs = [...texto.matchAll(/CNPJ:\s*([\d.\-\/]+)/gi)];
  if (cnpjs[0]) out.fornecedor_cnpj = cnpjs[0][1].replace(/\D/g, "");

  // Nome do beneficiário (linha antes do "CNPJ:" do beneficiário)
  const benef = texto.match(/Benefici[áa]rio\s*\n?\s*([^\n]+?)\s*-?\s*CNPJ/i);
  if (benef) out.fornecedor_nome = benef[1].trim();

  // Número do documento
  const num = texto.match(/N[º°]\s*do\s*Documento[\s\S]{0,40}?(\d{4,12})/i)
           ?? texto.match(/Nº Documento[\s\S]{0,40}?(\d{4,12})/i);
  if (num) out.numero = num[1];

  // Linha digitável (44+ dígitos)
  const linha = texto.match(/(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})/);
  if (linha) out.linha_digitavel = linha[1].replace(/\s+/g, " ");

  return out;
}
