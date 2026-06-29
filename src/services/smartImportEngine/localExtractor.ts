import * as XLSX from "xlsx";
import { parseTextToExpense } from "./localParserRules";
import type { ExtractorResult, NormalizedExpense } from "./types";

const parseCurrency = (raw: unknown) => {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return 0;

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

const parseDate = (raw: unknown) => {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().split("T")[0];
  }

  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      const year = String(parsed.y).padStart(4, "0");
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  if (typeof raw === "string") {
    const separated = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (separated) {
      const day = separated[1].padStart(2, "0");
      const month = separated[2].padStart(2, "0");
      const year = separated[3].length === 2 ? `20${separated[3]}` : separated[3];
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
};

export const extractSpreadsheet = async (file: File): Promise<ExtractorResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawJson: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);
        const expenses: NormalizedExpense[] = [];

        const findVal = (row: Record<string, unknown>, keywords: string[]) => {
          const key = Object.keys(row).find((columnName) => {
            const normalizedColumn = columnName.toLowerCase().trim();
            return keywords.some((keyword) => {
              const normalizedKeyword = keyword.toLowerCase();
              return normalizedColumn === normalizedKeyword || normalizedColumn.includes(normalizedKeyword);
            });
          });

          return key ? row[key] : null;
        };

        for (const row of rawJson) {
          const debitRaw = findVal(row, ["debito", "débito", "saida", "saída", "valor debito", "valor débito", "withdrawal"]);
          const creditRaw = findVal(row, ["credito", "crédito", "entrada", "valor credito", "valor crédito", "deposit", "credit"]);
          const valueRaw = findVal(row, ["valor", "preco", "preço", "custo", "amount", "total", "price"]);

          const debit = Math.abs(parseCurrency(debitRaw));
          const credit = Math.abs(parseCurrency(creditRaw));
          const signedValue = parseCurrency(valueRaw);
          const amount = credit || debit || Math.abs(signedValue);

          if (Number.isNaN(amount) || amount === 0) continue;

          const date = parseDate(findVal(row, ["data", "date", "vencimento", "dia", "dt lancamento", "dt lançamento"]));
          const description = String(
            findVal(row, ["descricao", "descrição", "historico", "histórico", "lancamento", "lançamento", "nome", "item", "description", "produto"]) || "",
          ).trim();
          const category = String(findVal(row, ["categoria", "category", "tipo", "setor"]) || "Outros").trim();
          const inferredCategory = category === "Outros" ? parseTextToExpense(description, "unknown").categoria : category;

          expenses.push({
            valor: amount,
            data: date,
            descricao: description || "Movimentacao bancaria",
            categoria: inferredCategory,
            origem: "planilha",
            tipo: credit > 0 || signedValue > 0 ? "income" : "expense",
            accountOrigin: "PF",
          });
        }

        resolve({ expenses });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        resolve({ expenses: [], error: `Falha ao ler planilha: ${message}` });
      }
    };

    reader.onerror = () => {
      resolve({ expenses: [], error: "Erro ao carregar o arquivo" });
    };

    reader.readAsBinaryString(file);
  });
};
