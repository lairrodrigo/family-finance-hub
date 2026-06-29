import { parseTextToExpense } from "./localParserRules";
import type { ExtractorResult, NormalizedExpense } from "./types";

const decodeEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const readTextFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Erro ao carregar arquivo bancario."));
    reader.readAsText(file, "utf-8");
  });

const parseAmount = (raw: string | null | undefined) => {
  if (!raw) return 0;
  const cleaned = raw
    .replace(/[^\d,.\-()]/g, "")
    .replace(/^\((.*)\)$/, "-$1")
    .trim();

  if (!cleaned) return 0;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  const normalized = hasComma && hasDot
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(",", ".");

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
};

const toIsoDate = (raw: string | null | undefined) => {
  if (!raw) return new Date().toISOString().split("T")[0];

  const compact = raw.match(/(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  const separated = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (separated) {
    const day = separated[1].padStart(2, "0");
    const month = separated[2].padStart(2, "0");
    const year = separated[3].length === 2 ? `20${separated[3]}` : separated[3];
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split("T")[0];
};

const inferCategory = (description: string) => parseTextToExpense(description, "unknown").categoria || "Outros";

const fromBankRow = (amount: number, date: string, description: string): NormalizedExpense | null => {
  if (!Number.isFinite(amount) || amount === 0) return null;

  const cleanedDescription = decodeEntities(description || "Movimentacao bancaria");

  return {
    valor: Math.abs(amount),
    data: date,
    descricao: cleanedDescription,
    categoria: inferCategory(cleanedDescription),
    origem: "bancario",
    tipo: amount >= 0 ? "income" : "expense",
    accountOrigin: "PF",
  };
};

const getOfxTag = (block: string, tag: string) => {
  const closed = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
  if (closed?.[1]) return closed[1].trim();

  const open = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i").exec(block);
  return open?.[1]?.trim() ?? "";
};

const parseOfx = (text: string) => {
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ?? [];

  return blocks
    .map((block) => {
      const amount = parseAmount(getOfxTag(block, "TRNAMT"));
      const date = toIsoDate(getOfxTag(block, "DTPOSTED"));
      const description =
        getOfxTag(block, "MEMO") ||
        getOfxTag(block, "NAME") ||
        getOfxTag(block, "PAYEE") ||
        getOfxTag(block, "TRNTYPE") ||
        "Movimentacao bancaria";

      return fromBankRow(amount, date, description);
    })
    .filter(Boolean) as NormalizedExpense[];
};

const parseQif = (text: string) => {
  const entries = text
    .split(/\n\^\s*/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries
    .map((entry) => {
      const lines = entry.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const valueByPrefix = (prefix: string) => lines.find((line) => line.startsWith(prefix))?.slice(1).trim() ?? "";

      const amount = parseAmount(valueByPrefix("T"));
      const date = toIsoDate(valueByPrefix("D"));
      const description = valueByPrefix("P") || valueByPrefix("M") || "Movimentacao bancaria";

      return fromBankRow(amount, date, description);
    })
    .filter(Boolean) as NormalizedExpense[];
};

export const extractBankStatement = async (file: File): Promise<ExtractorResult> => {
  try {
    const text = await readTextFile(file);
    const extension = file.name.split(".").pop()?.toLowerCase();

    const expenses = extension === "qif" ? parseQif(text) : parseOfx(text);

    if (expenses.length === 0) {
      return { expenses: [], error: "Nenhuma movimentacao bancaria encontrada no arquivo." };
    }

    return { expenses };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Falha ao ler arquivo bancario.";
    return { expenses: [], error: message };
  }
};
