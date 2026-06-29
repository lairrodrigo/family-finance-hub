import { NormalizedExpense, FileType } from './types';

// Motor Heurístico de Regras Locais (Zero custo, Sem Nuvem)
export const parseTextToExpense = (rawText: string, origem: FileType): NormalizedExpense => {
  const normalizedText = rawText.toUpperCase();
  
  // 1. Extração de VALOR
  // Tenta achar com prefixo ou palavras financeiras comuns
  const valueRegexes = [
    /(?:R\$|R\$ |TOTAL:?|VALOR:?|PAGAR:?|GASTEI:?|PREÇO:?|UN:?|UNI:?|OFERTA:?)\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})/gi,
    // Pegar preços "quebrados" comuns em etiquetas (ex: 5 grande e 99 pequeno)
    /(\d+)\s*[,.]?\s*(\d{2})\s*(?:UN|UNI|KG|ML|UNIDADE)/gi,
    /R\$\s*(\d+)\s*[,.]?\s*(\d{2})/gi,
    // Regex para áudio "X reais" ou "X com Y"
    /(\d+)\s*(?:REAIS|REAU|CONTO)/gi,
    /(\d+)\s*COM\s*(\d{1,2})/gi,
    // Formato comum de etiqueta: R$ 9,90 ou apenas 9,90 em destaque
    /R\$\s*(\d+[,.]\d{2})/gi,
    /(\d+[,.]\d{2})\s*(?:UN|UNI|KG|ML)/gi
  ];

  let finalValor = 0;
  const matches: number[] = [];

  for (const regex of valueRegexes) {
    const found = [...normalizedText.matchAll(regex)];
    found.forEach(m => {
      const valStr = m[1];
      // Se for formato "X reais", já é o valor
      if (m[0].includes("REAIS") || m[0].includes("CONTO")) {
        matches.push(parseFloat(valStr));
      } else if (m[0].includes("COM") && m[2]) {
        matches.push(parseFloat(`${m[1]}.${m[2]}`));
      } else {
        const val = parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(val)) matches.push(val);
      }
    });
  }

  // Se não achou por prefixos, pega o maior número com vírgula (cuidado com datas)
  if (matches.length === 0) {
    const genericMatches = [...normalizedText.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g)];
    genericMatches.forEach(m => {
      const val = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(val)) matches.push(val);
    });
  }

  if (matches.length > 0) {
    finalValor = Math.max(...matches);
  } else if (normalizedText.length < 50) {
    // Fallback: se o texto for curto e tiver UM número, assume que é o valor
    const singleNumMatch = normalizedText.match(/\d+(?:[.,]\d{1,2})?/);
    if (singleNumMatch) {
      finalValor = parseFloat(singleNumMatch[0].replace(',', '.'));
    }
  }

  // 2. Extração de DATA
  let dataISO = new Date().toISOString().split('T')[0];
  const dataRegex = /(\d{2})[/-](\d{2})[/-](\d{2,4})/;
  const dataMatch = rawText.match(dataRegex);
  if (dataMatch) {
    const [, d, m, rawYear] = dataMatch;
    let y = rawYear;
    if (y.length === 2) y = "20" + y;
    dataISO = `${y}-${m}-${d}`;
  }

  // 3. Extração de CATEGORIA
  const categoria = discoverCategory(normalizedText);

  // 4. Formatação de DESCRIÇÃO (Limpeza de "texto feio")
  let descricao = cleanDescription(rawText, finalValor);
  
  // Se a limpeza esvaziar tudo, usa o fallback de origem
  if (!descricao) {
    descricao = "Importação via " + (origem === 'image' ? "Imagem" : origem === 'audio' ? "Voz" : "PDF");
  }

  return {
    valor: finalValor,
    data: dataISO,
    descricao,
    categoria,
    origem: normalizeOrigin(origem)
  };
};

export const parseTextToExpenses = (rawText: string, origem: FileType): NormalizedExpense[] => {
  const statementExpenses = parseBankStatementText(rawText, origem);
  if (statementExpenses.length > 0) return statementExpenses;

  const expense = parseTextToExpense(rawText, origem);
  return expense.valor > 0 ? [expense] : [];
};

const normalizeOrigin = (origem: FileType): NormalizedExpense["origem"] => {
  if (origem === "spreadsheet") return "planilha";
  if (origem === "bank") return "bancario";
  if (origem === "image") return "imagem";
  if (origem === "pdf") return "pdf";
  if (origem === "audio") return "audio";
  return "desconhecido";
};

const MONTHS_PT: Record<string, string> = {
  JAN: "01",
  FEV: "02",
  MAR: "03",
  ABR: "04",
  MAI: "05",
  JUN: "06",
  JUL: "07",
  AGO: "08",
  SET: "09",
  OUT: "10",
  NOV: "11",
  DEZ: "12",
};

type StatementTransactionDraft = {
  title: string;
  date: string;
  tipo: "income" | "expense";
  descriptionLines: string[];
};

const parseBankStatementText = (rawText: string, origem: FileType): NormalizedExpense[] => {
  const lines = rawText
    .split(/\r?\n/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (lines.length < 8) return [];

  const expenses: NormalizedExpense[] = [];
  let currentDate = "";
  let currentSection: "income" | "expense" | null = null;
  let skipNextSectionTotal = false;
  let draft: StatementTransactionDraft | null = null;

  const finishDraft = (amountLine: string) => {
    if (!draft) return;

    const amount = Math.abs(parseStatementAmount(amountLine));
    if (!Number.isFinite(amount) || amount === 0) {
      draft = null;
      return;
    }

    const description = cleanStatementDescription(draft.title, draft.descriptionLines);
    expenses.push({
      valor: amount,
      data: draft.date || new Date().toISOString().split("T")[0],
      descricao: description,
      categoria: discoverCategory(`${draft.title} ${description}`.toUpperCase()),
      origem: normalizeOrigin(origem),
      tipo: inferTypeFromAmount(amountLine) || draft.tipo,
      accountOrigin: "PF",
    });
    draft = null;
  };

  for (const line of lines) {
    const parsedDate = parsePtStatementDate(line);
    if (parsedDate) {
      if (draft) draft = null;
      currentDate = parsedDate;
      currentSection = null;
      skipNextSectionTotal = false;
      continue;
    }

    const flow = parseStatementFlowHeader(line);
    if (flow) {
      if (draft) draft = null;
      currentSection = flow;
      skipNextSectionTotal = true;
      continue;
    }

    if (skipNextSectionTotal && isStatementAmountLine(line, true)) {
      skipNextSectionTotal = false;
      continue;
    }

    if (isStatementNoiseLine(line)) continue;

    if (draft) {
      if (isStatementAmountLine(line)) {
        finishDraft(line);
        continue;
      }

      draft.descriptionLines.push(line);
      continue;
    }

    const transactionType = inferStatementTransactionType(line, currentSection);
    if (transactionType && currentDate) {
      draft = {
        title: normalizeStatementTitle(line),
        date: currentDate,
        tipo: transactionType,
        descriptionLines: [],
      };
    }
  }

  return expenses;
};

const parsePtStatementDate = (line: string) => {
  const match = line.match(/^(\d{1,2})\s+([A-ZÇ]{3})\s+(\d{4})$/i);
  if (!match) return "";

  const day = match[1].padStart(2, "0");
  const month = MONTHS_PT[removeAccents(match[2]).toUpperCase()];
  return month ? `${match[3]}-${month}-${day}` : "";
};

const parseStatementFlowHeader = (line: string): "income" | "expense" | null => {
  const normalized = removeAccents(line).toUpperCase();
  if (/^TOTAL DE ENTRADAS\b/.test(normalized)) return "income";
  if (/^TOTAL DE SAIDAS\b/.test(normalized)) return "expense";
  return null;
};

const inferTypeFromAmount = (line: string): "income" | "expense" | null => {
  const trimmed = line.trim();
  if (trimmed.startsWith("+")) return "income";
  if (trimmed.startsWith("-")) return "expense";
  return null;
};

const inferStatementTransactionType = (
  line: string,
  currentSection: "income" | "expense" | null,
): "income" | "expense" | null => {
  const normalized = removeAccents(line).toUpperCase();

  if (/^(TRANSFERENCIA|PIX|TED|DOC)/.test(normalized) && /(RECEBIDA|RECEBIDO|ENTRADA|DEPOSITO)/.test(normalized)) return "income";
  if (/^(TRANSFERENCIA|PIX|TED|DOC)/.test(normalized) && /(ENVIADA|ENVIADO|SAIDA)/.test(normalized)) return "expense";
  if (/^(PAGAMENTO|COMPRA|SAQUE|APLICACAO|DEBITO|BOLETO|TARIFA|IMPOSTO|RECARGA)/.test(normalized)) return "expense";
  if (/^(RECEBIMENTO|DEPOSITO|RESGATE|REEMBOLSO|RENDIMENTO|ESTORNO)/.test(normalized)) return "income";

  return null;
};

const isStatementAmountLine = (line: string, allowSign = false) => {
  const pattern = allowSign
    ? /^[+-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}$/
    : /^\d{1,3}(?:\.\d{3})*,\d{2}$/;
  return pattern.test(line.trim());
};

const parseStatementAmount = (line: string) => {
  const normalized = line.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
};

const normalizeStatementTitle = (line: string) => {
  const normalized = line.trim().replace(/\s+/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const cleanStatementDescription = (title: string, descriptionLines: string[]) => {
  const rawDescription = descriptionLines
    .filter((line) => !isStatementNoiseLine(line))
    .join(" ")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

  const description = rawDescription || title;
  const withTitle = rawDescription ? `${title} - ${description}` : description;
  return withTitle.length > 180 ? `${withTitle.slice(0, 177).trim()}...` : withTitle;
};

const isStatementNoiseLine = (line: string) => {
  const normalized = removeAccents(line).toUpperCase();

  if (/^(CPF|AGENCIA|CONTA|VALORES EM R\$|MOVIMENTACOES|SALDO|RENDIMENTO LIQUIDO)$/.test(normalized)) return true;
  if (/^(SALDO INICIAL|SALDO FINAL|TOTAL DE ENTRADAS|TOTAL DE SAIDAS)$/.test(normalized)) return true;
  if (/^\d+\s+DE\s+\d+$/.test(normalized)) return true;
  if (/^\d{4}$/.test(normalized)) return true;
  if (normalized === "A") return true;
  if (normalized.includes("TEM ALGUMA DUVIDA")) return true;
  if (normalized.includes("CASO A SOLUCAO")) return true;
  if (normalized.includes("OUVIDORIA")) return true;
  if (normalized.includes("EXTRATO GERADO")) return true;
  if (normalized.includes("NUBANK.COM.BR")) return true;
  if (normalized.includes("NAO NOS RESPONSABILIZAMOS")) return true;
  if (normalized.includes("ASSEGURAMOS A AUTENTICIDADE")) return true;
  if (normalized.includes("O SALDO LIQUIDO CORRESPONDE")) return true;
  if (normalized.includes("NU FINANCEIRA")) return true;
  if (normalized.includes("NU PAGAMENTOS")) return true;
  if (normalized.includes("CNPJ:")) return true;

  return false;
};

const removeAccents = (value: string) => (
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
);

const cleanDescription = (text: string, valor: number): string => {
  let cleaned = text.toUpperCase();
  
  // 1. Remoção de ruído agressivo (Symbol Soup)
  // Remove sequências de caracteres especiais grudados
  cleaned = cleaned.replace(/[=/#\\[\]{}|<>_&%*]{2,}/g, ' ');
  
  // 2. Lista expandida de ruídos de OCR e termos comuns de etiquetas
  const noise = [
    /GASTEI/g, /PAGUEI/g, /COMPREI/g, /FOI/g, /R\$/g, /REAL/g, /REAIS/g, /CONTO/g,
    /OFERTA/g, /VALOR/g, /VAL\.?/g, /PREÇO/g, /UNID?/g, /TOTAL/g, /UNIDADE/g,
    /VENC/g, /LOTE/g, /PROMO/g, /DESC\.?/g,
    /\b[A-Z]\b/g, // Letras maiúsculas isoladas (quase sempre ruído de OCR)
    new RegExp(`${valor}`.replace('.', ','), 'g'),
    /\d+([.,]\d{1,2})?/g, // Remove qualquer número restante
    / NO /g, / NA /g, / EM /g, / COM /g, / DE /g, / DA /g, / DO /g
  ];

  noise.forEach(row => {
    cleaned = cleaned.replace(row, ' ');
  });

  // 3. Limpeza de acentos e caracteres isolados no início/fim
  cleaned = cleaned.replace(/[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÛ]/g, ' ');
  cleaned = cleaned.replace(/[^A-Z0-9\s]/g, ' '); // Remove QUALQUER coisa que não seja letra, número ou espaço
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned || cleaned.length < 3) return "";

  // 4. Heurística de Qualidade: Se a string tem mais de 20% de ruído, tenta filtrar apenas palavras conhecidas
  // (Aqui poderíamos ter um dicionário, mas vamos manter simples removendo ruído comum no final)
  cleaned = cleaned.replace(/\s[A-Z]$/, '');

  // Formatar: Primeira letra Maiúscula, resto minúscula
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

const discoverCategory = (text: string): string => {
  const keywords: Record<string, string[]> = {
    'Alimentação': ['MERCADO', 'RESTAURANTE', 'IFOOD', 'PADARIA', 'LANCHE', 'PIZZA', 'BURGER', 'ATACADAO', 'CARREFOUR', 'EXTRA', 'PÃO', 'PAO', 'CAFÉ', 'CAFE', 'ALMOÇO', 'CHURRASCO'],
    'Transporte': ['UBER', '99APP', 'POSTO', 'GASOLINA', 'COMBUSTIVEL', 'SHELL', 'IPIRANGA', 'AUTO', 'OFFICE', 'ESTACIONAMENTO', 'PEDAGIO'],
    'Moradia': ['ALUGUEL', 'CONDOMINIO', 'LUZ', 'ENERGIA', 'AGUA', 'CONTA', 'INTERNET', 'WIFI', 'NET', 'IPTU', 'REFORMA'],
    'Saúde': ['FARMACIA', 'DROGASIL', 'PACHECO', 'HOSPITAL', 'EXAME', 'MEDICO', 'DENTISTA', 'SAUDE', 'REMEDIO'],
    'Lazer': ['CINEMA', 'SHOPPING', 'BAR', 'BALADA', 'CERVEJA', 'INGRESSO', 'SHOW', 'HOTEL', 'VIAGEM'],
    'Shopping': ['ROUPA', 'CALÇADO', 'TENIS', 'LOJA', 'RENNER', 'RIACHUELO', 'ZARA', 'C&A', 'MERCADO LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU'],
    'Assinaturas': ['NETFLIX', 'SPOTIFY', 'GOOGLE', 'iCLOUD', 'APPLE', 'DISNEY', 'HBO', 'PRIME'],
    'Educação': ['LIVRO', 'ESCOLA', 'FACULDADE', 'CURSO', 'MENSALIDADE', 'PAPELARIA']
  };

  for (const [cat, words] of Object.entries(keywords)) {
    if (words.some(word => text.includes(word))) return cat;
  }
  return 'Outros';
};
