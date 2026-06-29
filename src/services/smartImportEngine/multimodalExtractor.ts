import { extractFinancialDocumentWithAI } from "./documentAiExtractor";
import { parseTextToExpense } from "./localParserRules";
import type { ExtractorResult, FileType } from "./types";

export const extractMultimodal = async (
  file: File,
  type: FileType,
  onProgress?: (message: string) => void,
  transcript?: string,
  audioUrl?: string,
): Promise<ExtractorResult> => {
  try {
    if (type === "image") {
      try {
        const aiResult = await extractFinancialDocumentWithAI(file, onProgress);
        if (aiResult.expenses.length > 0) return aiResult;
      } catch (aiErr) {
        console.warn("Falha na IA do documento, tentando OCR local.", aiErr);
      }

      if (onProgress) onProgress("Iniciando OCR local...");
      try {
        const text = await scanImageLocal(file, onProgress);
        if (!text || text.trim() === "") throw new Error("A imagem nao continha texto legivel.");
        const expense = parseTextToExpense(text, "image");
        return { expenses: [expense] };
      } catch {
        return {
          expenses: [{
            valor: 0,
            data: new Date().toISOString().split("T")[0],
            descricao: `Anexo de Imagem (${file.name})`,
            categoria: "Outros",
            origem: "imagem",
          }],
        };
      }
    }

    if (type === "pdf") {
      try {
        const aiResult = await extractFinancialDocumentWithAI(file, onProgress);
        if (aiResult.expenses.length > 0) return aiResult;
      } catch (aiErr) {
        console.warn("Falha na IA do documento, tentando leitura local.", aiErr);
      }

      if (onProgress) onProgress("Extraindo texto do PDF localmente...");
      try {
        const text = await extractPdfTextLocal(file, onProgress);
        const expense = parseTextToExpense(text, "pdf");
        return { expenses: [expense] };
      } catch {
        return {
          expenses: [{
            valor: 0,
            data: new Date().toISOString().split("T")[0],
            descricao: `Anexo de Documento (${file.name})`,
            categoria: "Outros",
            origem: "pdf",
          }],
        };
      }
    }

    if (type === "audio") {
      if (onProgress) onProgress("Processando audio via motor nativo...");
      const text = transcript || "";
      const expense = parseTextToExpense(text, "audio");
      expense.audioUrl = audioUrl;
      return { expenses: [expense] };
    }

    return { expenses: [], error: "Formato nao reconhecido." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro no processamento.";
    return { expenses: [], error: message };
  }
};

const scanImageLocal = async (file: File, onProgress?: (m: string) => void): Promise<string> => {
  const Tesseract = (await import("tesseract.js")).default;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    Tesseract.recognize(url, "por", {
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress(`Escaneando: ${Math.round(m.progress * 100)}% concluido...`);
        }
      },
    }).then(({ data: { text } }) => {
      URL.revokeObjectURL(url);
      resolve(text);
    }).catch((err) => {
      URL.revokeObjectURL(url);
      reject(err);
    });
  });
};

const extractPdfTextLocal = async (file: File): Promise<string> => {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: unknown) => (item as { str?: string }).str ?? "");
    fullText += strings.join(" ") + "\n";
  }

  return fullText;
};
