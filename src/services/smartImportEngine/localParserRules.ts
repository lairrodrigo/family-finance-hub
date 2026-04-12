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
  let matches: number[] = [];

  for (const regex of valueRegexes) {
    const found = [...normalizedText.matchAll(regex)];
    found.forEach(m => {
      let valStr = m[1];
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
  const dataRegex = /(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})/;
  const dataMatch = rawText.match(dataRegex);
  if (dataMatch) {
    let [, d, m, y] = dataMatch;
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
    origem: origem as any
  };
};

const cleanDescription = (text: string, valor: number): string => {
  let cleaned = text.toUpperCase();
  
  // 1. Remoção de ruído agressivo (Symbol Soup)
  // Remove sequências de caracteres especiais grudados
  cleaned = cleaned.replace(/[=/#\\\[\]{}|<>_&%*]{2,}/g, ' ');
  
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
