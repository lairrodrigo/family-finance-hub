import { parseShoppingTag, ShoppingTagResult } from './src/services/smartImportEngine/shoppingTagParser';

const text1 = 'À aaa dz à y se & ra ko é "" p - oferta =-- " % sopa knorr e". val pr if e ; v [ex arco // ar —=';

function testParse(rawText: string) {
  let cleanText = rawText.replace(/\n|\||\[|\]/g, ' ').toUpperCase();
  
  // Extract Price
  let price = 0;
  const pricePats = [
    /R\$\s*(\d+)\s*[,.]\s*(\d{2})/i,
    /(\d+)\s*[,.]\s*(\d{2})/i,
  ];
  for (const pat of pricePats) {
    const m = cleanText.match(pat);
    if (m) {
      price = parseFloat(`${m[1]}.${m[2]}`);
      break;
    }
  }

  // Remove noise tokens
  const NOISE_TOKENS = /\b(R\$|OFERTA|PROMOÇÃO|PROMO|UN|UNI|UNIDADE|KG|G|ML|LT|VAL|VALOR|TOTAL|EM|DE|DA|DO|PR|EX|ARCO|IF|DZ|SE|RA|KO)\b/g;
  cleanText = cleanText.replace(NOISE_TOKENS, ' ');

  // Split into segments by special characters
  const segments = cleanText.split(/[^A-ZÀ-Ú0-9\s]+/g)
    .map(s => s.trim().replace(/\b\w\b/g, '').replace(/\s+/g, ' ').trim()) // remove single letters
    .filter(s => s.length > 3);
  
  let name = "";
  if (segments.length > 0) {
    // Score by: Average Word Length * 2 + Word Count
    // Nonsense OCR usually has short 2-3 letter words. Real products have longer words.
    const scored = segments.map(seg => {
      const words = seg.split(' ');
      const avgLen = words.reduce((sum, w) => sum + w.length, 0) / words.length;
      const score = avgLen * 2 + words.length;
      return { seg, score };
    });

    scored.sort((a, b) => b.score - a.score);
    name = scored[0].seg;
  }
  
  if (name) {
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  } else {
    name = "Produto Escaneado";
  }

  return { name, price };
}

console.log(testParse(text1));
console.log(testParse('Oferta\nSOPA KNORR 73G LETRINHAS\nR$\n5\n,\n99\nunidade'));
console.log(testParse('enxuto\nOferta\nSOPA KNORR 73G\nLETRINHAS\nR$ 5 ,99\nunidade'));
console.log(testParse('Aaa dz se ra ko " - =-- " sopa knorr ". pr if ; [ex arco // ar -= ]'));
