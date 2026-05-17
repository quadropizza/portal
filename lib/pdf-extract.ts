/**
 * Extração de texto de PDF via pdf2json (funciona em serverless do Vercel).
 * Agrupa textos por linha (Y arredondado) e ordena por coluna (X) pra
 * preservar layout. Funciona com Fast Report + extrato Sicredi + NF-e PDF.
 */
import PDFParser from "pdf2json";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();
    parser.on("pdfParser_dataError", (err: any) => reject(err.parserError ?? err));
    parser.on("pdfParser_dataReady", (data: any) => {
      try {
        const linhas: string[] = [];
        for (const page of data.Pages ?? []) {
          // Agrupa por Y arredondado pra próxima linha textual (tolerância 0.5)
          const porLinha = new Map<number, Array<{ x: number; text: string }>>();
          for (const t of page.Texts ?? []) {
            const yRound = Math.round((t.y as number) * 2) / 2;
            const x = t.x as number;
            const raw = (t.R ?? []).map((r: any) => r.T).join("");
            let texto: string;
            try { texto = decodeURIComponent(raw); }
            catch { texto = raw.replace(/%[0-9A-Fa-f]{0,2}/g, "?"); }
            if (!porLinha.has(yRound)) porLinha.set(yRound, []);
            porLinha.get(yRound)!.push({ x, text: texto });
          }
          const ys = [...porLinha.keys()].sort((a, b) => a - b);
          for (const y of ys) {
            const itens = porLinha.get(y)!.sort((a, b) => a.x - b.x);
            // Junta texto preservando spacing com base em distância X
            let linha = "";
            let prevEnd = -1;
            for (const it of itens) {
              if (prevEnd < 0) linha = it.text;
              else {
                const gap = Math.max(1, Math.round((it.x - prevEnd) * 1.5));
                linha += " ".repeat(gap) + it.text;
              }
              prevEnd = it.x + it.text.length * 0.5;
            }
            linhas.push(linha);
          }
          linhas.push("");
        }
        resolve(linhas.join("\n"));
      } catch (e) {
        reject(e);
      }
    });
    parser.parseBuffer(buffer);
  });
}
