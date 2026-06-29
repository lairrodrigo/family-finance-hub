import { extractFinancialDocumentWithAI } from "./documentAiExtractor";
import { parseTextToExpense, parseTextToExpenses } from "./localParserRules";
import type { ExtractorResult, FileType } from "./types";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const AI_EXTRACTION_TIMEOUT_MS = 30_000;
const PDF_LOCAL_TIMEOUT_MS = 45_000;
const PDF_OPEN_TIMEOUT_MS = 12_000;
const PDF_PAGE_TIMEOUT_MS = 8_000;
const MAX_LOCAL_PDF_PAGES = 8;
const MAX_LOCAL_PDF_TEXT_LENGTH = 50_000;

class ImportTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportTimeoutError";
  }
}

const isImportTimeoutError = (err: unknown) => (
  err instanceof Error && err.name === "ImportTimeoutError"
);

const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  message: string,
  onTimeout?: () => void,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      onTimeout?.();
      reject(new ImportTimeoutError(message));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
};

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
        const aiResult = await withTimeout(
          extractFinancialDocumentWithAI(file, onProgress),
          AI_EXTRACTION_TIMEOUT_MS,
          "A analise segura demorou demais.",
        );
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
      if (onProgress) onProgress("Extraindo texto do PDF localmente...");
      try {
        const text = await withTimeout(
          extractPdfTextLocal(file, onProgress),
          PDF_LOCAL_TIMEOUT_MS,
          "A extracao local do PDF demorou demais.",
        );
        if (!text.trim()) throw new Error("O PDF nao continha texto pesquisavel.");

        const expenses = parseTextToExpenses(text, "pdf");
        if (expenses.length === 0) {
          throw new Error("O PDF nao continha movimentacoes com valor.");
        }

        return { expenses };
      } catch (localErr) {
        console.warn("Falha na leitura local do PDF.", localErr);

        if (isImportTimeoutError(localErr)) {
          return {
            expenses: [],
            error: "O PDF demorou demais para ser lido no celular. Tente um PDF menor, CSV/OFX ou um print das paginas principais.",
          };
        }

        return {
          expenses: [],
          error: "Nao consegui ler movimentacoes neste PDF. Tente um print/foto das paginas principais ou um arquivo CSV/OFX.",
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

const extractPdfTextLocal = async (file: File, onProgress?: (m: string) => void): Promise<string> => {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    isEvalSupported: false,
    maxImageSize: 8_000_000,
    stopAtErrors: false,
    useWorkerFetch: false,
  });
  const pdf = await withTimeout(
    loadingTask.promise,
    PDF_OPEN_TIMEOUT_MS,
    "O PDF demorou demais para abrir.",
    () => { void loadingTask.destroy().catch(() => undefined); },
  );

  let fullText = "";
  const pagesToRead = Math.min(pdf.numPages, MAX_LOCAL_PDF_PAGES);

  try {
    for (let i = 1; i <= pagesToRead; i++) {
      onProgress?.(`Lendo PDF localmente: pagina ${i} de ${pagesToRead}...`);

      const page = await withTimeout(
        pdf.getPage(i),
        PDF_PAGE_TIMEOUT_MS,
        `A pagina ${i} demorou demais para abrir.`,
      );
      const content = await withTimeout(
        page.getTextContent(),
        PDF_PAGE_TIMEOUT_MS,
        `A pagina ${i} demorou demais para extrair texto.`,
      );
      const strings = content.items
        .map((item: unknown) => (item as { str?: string }).str?.trim() ?? "")
        .filter(Boolean);
      fullText += strings.join("\n") + "\n";
      page.cleanup();

      if (fullText.length >= MAX_LOCAL_PDF_TEXT_LENGTH) {
        fullText = fullText.slice(0, MAX_LOCAL_PDF_TEXT_LENGTH);
        break;
      }
    }
  } finally {
    await pdf.destroy().catch(() => undefined);
  }

  return fullText;
};
