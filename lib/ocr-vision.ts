/**
 * OCR de imagem (DARF/FGTS/foto de boleto) via Anthropic Vision.
 * Requer ANTHROPIC_API_KEY no env.
 * Retorna dados estruturados: tipo, valor, vencimento, número, fornecedor.
 */
import Anthropic from "@anthropic-ai/sdk";

export type OcrResult = {
  ok: boolean;
  tipo?: "tributo" | "encargo_trabalhista" | "boleto_avulso" | "nf_fornecedor";
  valor?: number;
  vencimento?: string;
  numero?: string;
  competencia?: string;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
  observacoes?: string;
  raw?: string;
  erro?: string;
};

const PROMPT = `Analise este documento financeiro brasileiro (DARF, FGTS/GFD, boleto bancário, NF) e extraia em JSON:

{
  "tipo": "tributo" | "encargo_trabalhista" | "boleto_avulso" | "nf_fornecedor",
  "valor": número decimal (R$),
  "vencimento": "YYYY-MM-DD",
  "numero": "string",
  "competencia": "MM/AAAA" (se DARF/FGTS),
  "fornecedor_nome": "string",
  "fornecedor_cnpj": "string sem pontuação"
}

Regras:
- DARF/DCTFWeb/INSS = "tributo"
- GFD/FGTS = "encargo_trabalhista"
- Boleto comum = "boleto_avulso"
- Nota fiscal = "nf_fornecedor"
- Use o "Pagar até" como vencimento
- Use o "Valor Total" / "Valor a recolher"
- Responda APENAS o JSON, sem markdown ou explicação.`;

export async function ocrImagem(buffer: Buffer, mime: string): Promise<OcrResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false, erro: "OCR indisponível (ANTHROPIC_API_KEY não configurada). Preencha manualmente." };
  }

  const client = new Anthropic({ apiKey: key });
  const base64 = buffer.toString("base64");
  const mediaType = mime.startsWith("image/") ? mime : "image/jpeg";

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType as any, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      }],
    });
    const text = msg.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text).join("");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ok: false, erro: "Resposta sem JSON", raw: text };
    const data = JSON.parse(jsonMatch[0]);
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * OCR de PDF que contém imagem (ex: DARF gerado como bitmap).
 * Converte primeira página em imagem via pdf2pic não tá disponível em serverless,
 * então enviamos o PDF inteiro pro Claude que aceita PDFs nativamente.
 */
export async function ocrPdfImagem(buffer: Buffer): Promise<OcrResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false, erro: "OCR indisponível (ANTHROPIC_API_KEY não configurada). Preencha manualmente." };
  }
  const client = new Anthropic({ apiKey: key });
  const base64 = buffer.toString("base64");
  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as any,
          { type: "text", text: PROMPT },
        ],
      }],
    });
    const text = msg.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text).join("");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ok: false, erro: "Resposta sem JSON", raw: text };
    const data = JSON.parse(jsonMatch[0]);
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}
