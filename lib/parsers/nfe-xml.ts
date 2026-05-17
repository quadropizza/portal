/**
 * Parser de XML de NF-e (padrão SEFAZ).
 * Decisão §13.4 do CLAUDE.md.
 *
 * Extrai do XML: chave de acesso, emit (fornecedor com CNPJ),
 * total, vencimentos das duplicatas, e itens.
 *
 * Implementação por regex pra evitar dependência de parser XML pesado
 * num serverless. Funciona pra estrutura típica do NF-e SEFAZ.
 */

export type NfeItem = {
  cProd: string;
  descricao: string;
  ncm: string | null;
  qtd: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
};

export type NfeDuplicata = {
  numero: string;
  vencimento: string; // YYYY-MM-DD
  valor: number;
};

export type NfeResult = {
  chave_acesso: string | null;
  numero: string | null;
  serie: string | null;
  data_emissao: string | null;
  fornecedor: {
    cnpj: string | null;
    nome: string | null;
    nome_fantasia: string | null;
  };
  valor_total: number | null;
  items: NfeItem[];
  duplicatas: NfeDuplicata[];
};

export function parseNfeXml(xml: string): NfeResult {
  const get = (tag: string, source: string = xml): string | null => {
    const m = source.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
    return m ? m[1].trim() : null;
  };
  const num = (s: string | null): number | null => (s ? parseFloat(s) : null);

  // chave de acesso vem como atributo Id="NFe<44>"
  const chaveM = xml.match(/Id="NFe(\d{44})"/);
  const chave = chaveM ? chaveM[1] : null;

  // emit (emitente)
  const emitM = xml.match(/<emit>([\s\S]*?)<\/emit>/);
  const emitBlock = emitM ? emitM[1] : "";
  const cnpjEmit = get("CNPJ", emitBlock);
  const nomeEmit = get("xNome", emitBlock);
  const fantasiaEmit = get("xFant", emitBlock);

  // ide (identificação)
  const ideM = xml.match(/<ide>([\s\S]*?)<\/ide>/);
  const ideBlock = ideM ? ideM[1] : "";
  const numero = get("nNF", ideBlock);
  const serie = get("serie", ideBlock);
  const dhEmi = get("dhEmi", ideBlock);
  const dataEmissao = dhEmi ? dhEmi.split("T")[0] : null;

  // total
  const totalM = xml.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/);
  const totalBlock = totalM ? totalM[1] : "";
  const valorTotal = num(get("vNF", totalBlock));

  // items: cada <det nItem="X"><prod>...</prod></det>
  const items: NfeItem[] = [];
  for (const m of xml.matchAll(/<det\s+nItem="\d+">([\s\S]*?)<\/det>/g)) {
    const detBlock = m[1];
    const prodM = detBlock.match(/<prod>([\s\S]*?)<\/prod>/);
    if (!prodM) continue;
    const p = prodM[1];
    items.push({
      cProd: get("cProd", p) ?? "",
      descricao: get("xProd", p) ?? "",
      ncm: get("NCM", p),
      qtd: num(get("qCom", p)) ?? 0,
      unidade: get("uCom", p) ?? "UN",
      valor_unitario: num(get("vUnCom", p)) ?? 0,
      valor_total: num(get("vProd", p)) ?? 0,
    });
  }

  // duplicatas (cobrança)
  const duplicatas: NfeDuplicata[] = [];
  for (const m of xml.matchAll(/<dup>([\s\S]*?)<\/dup>/g)) {
    const d = m[1];
    duplicatas.push({
      numero: get("nDup", d) ?? "",
      vencimento: get("dVenc", d) ?? "",
      valor: num(get("vDup", d)) ?? 0,
    });
  }

  return {
    chave_acesso: chave,
    numero,
    serie,
    data_emissao: dataEmissao,
    fornecedor: { cnpj: cnpjEmit, nome: nomeEmit, nome_fantasia: fantasiaEmit },
    valor_total: valorTotal,
    items,
    duplicatas,
  };
}
