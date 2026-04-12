export interface ShoppingTagResult {
  name: string;
  price: number;
  rawText: string;
}

export const parseShoppingTag = (rawText: string): ShoppingTagResult => {
  let cleanText = rawText.replace(/\n|\||\[|\]/g, ' ').toUpperCase();
  
  // ===== PASSO 1: EXTRAIR PREÇO =====
  let price = 0;
  const pricePats = [
    // R$ 5,99
    /R\$\s*(\d{1,3})\s*[,.]\s*(\d{2})/i,
    // Preço quebrado sem R$: 5,99
    /(\d{1,3})\s*[,.]\s*(\d{2})/i,
  ];

  for (const pat of pricePats) {
    const m = cleanText.match(pat);
    if (m) {
      price = parseFloat(`${m[1]}.${m[2]}`);
      break;
    }
  }

  // Remove o preço extraído do texto para não confundir a leitura do nome
  if (price > 0) {
     const pStr = price.toString().split('.');
     cleanText = cleanText.replace(new RegExp(`\\b${pStr[0]}\\b`), ' ');
     if (pStr[1]) cleanText = cleanText.replace(new RegExp(`\\b${pStr[1]}\\b`), ' ');
  }

  // ===== PASSO 2: EXTRAIR NOME =====
  // 1. Remover tokens comuns de ruído
  const NOISE_TOKENS = /\b(R\$|OFERTA|PROMOÇÃO|PROMO|UN|UNI|UNIDADE|KG|G|ML|LT|VAL|VALOR|TOTAL|EM|DE|DA|DO|PR|EX|ARCO|IF|DZ|SE|RA|KO)\b/g;
  cleanText = cleanText.replace(NOISE_TOKENS, ' ');

  // 2. Dividir em blocos a partir de caracteres especiais e pontuações
  const segments = cleanText.split(/[^A-ZÀ-Ú0-9\s]+/g)
    // Remove letras isoladas dentro dos blocos (comum em falhas de OCR)
    .map(s => s.trim().replace(/\b\w\b/g, '').replace(/\s+/g, ' ').trim())
    // Descarta blocos muito curtos
    .filter(s => s.length > 3);
  
  let name = "";
  if (segments.length > 0) {
    // 3. Pontuar os segmentos baseado no comprimento médio das palavras
    // Nomes de produtos reais têm palavras mais longas (ex: "SOPA KNORR"). 
    // Ruído de código de barras ou logo tem palavras curtas.
    const scored = segments.map(seg => {
      const words = seg.split(' ');
      const avgLen = words.reduce((sum, w) => sum + w.length, 0) / words.length;
      const score = avgLen * 2 + words.length;
      return { seg, score };
    });

    // Pega o segmento com a pontuação mais alta
    scored.sort((a, b) => b.score - a.score);
    name = scored[0].seg;
  }
  
  // 4. Formatação Final
  if (name) {
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  } else {
    name = "Produto Escaneado";
  }

  return { name, price, rawText };
};
