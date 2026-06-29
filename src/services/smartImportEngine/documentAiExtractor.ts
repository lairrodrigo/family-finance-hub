import { supabase } from "@/integrations/supabase/client";
import type { ExtractorResult, NormalizedExpense } from "./types";

type AIRawTransaction = {
  date?: string;
  amount?: number;
  description?: string;
  type?: "income" | "expense";
  categorySuggestion?: string;
  origin?: "PF" | "PJ";
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Erro ao carregar arquivo."));
    reader.readAsDataURL(file);
  });

const inferMimeType = (file: File) => {
  if (file.type) return file.type;

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return "application/octet-stream";
};

export const extractFinancialDocumentWithAI = async (
  file: File,
  onProgress?: (message: string) => void,
): Promise<ExtractorResult> => {
  onProgress?.("Enviando documento para analise segura...");

  const fileBase64 = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke("process-financial-document", {
    body: {
      fileBase64,
      mimeType: inferMimeType(file),
      contextType: "finance",
      fileName: file.name,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const today = new Date().toISOString().split("T")[0];
  const transactions = (data?.transactions ?? []) as AIRawTransaction[];
  const expenses: NormalizedExpense[] = transactions
    .filter((transaction) => typeof transaction.amount === "number" && !Number.isNaN(transaction.amount))
    .map((transaction) => {
      const amount = transaction.amount as number;
      return {
        valor: Math.abs(amount),
        data: transaction.date && /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) ? transaction.date : today,
        descricao: (transaction.description || "Movimentacao importada").trim(),
        categoria: transaction.categorySuggestion || "Outros",
        origem: file.type.includes("image") ? "imagem" : "pdf",
        tipo: transaction.type || (amount >= 0 ? "income" : "expense"),
        accountOrigin: transaction.origin === "PJ" ? "PJ" : "PF",
      };
    });

  if (expenses.length === 0) {
    throw new Error("Nenhuma transacao financeira encontrada no documento.");
  }

  return { expenses };
};
