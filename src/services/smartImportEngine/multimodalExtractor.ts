import { ExtractorResult, FileType } from './types';
import { parseTextToExpense } from './localParserRules';

export const extractMultimodal = async (
  file: File, 
  type: FileType,
  onProgress?: (message: string) => void,
  transcript?: string,
  audioUrl?: string
): Promise<ExtractorResult> => {

  try {
    if (type === 'image') {
      if (onProgress) onProgress("Iniciando motor de Scanner (OCR Local)...");
      try {
        const text = await scanImageLocal(file, onProgress);
        if (!text || text.trim() === '') throw new Error("A imagem não continha texto legível.");
        const expense = parseTextToExpense(text, 'image');
        return { expenses: [expense] };
      } catch (innerErr) {
        return { expenses: [{ valor: 0, data: new Date().toISOString().split('T')[0], descricao: `Anexo de Imagem (${file.name})`, categoria: 'Outros', origem: 'imagem' }] };
      }
    }

    if (type === 'pdf') {
      if (onProgress) onProgress("Extraindo texto do PDF localmente...");
      try {
        const text = await extractPdfTextLocal(file, onProgress);
        const expense = parseTextToExpense(text, 'pdf');
        return { expenses: [expense] };
      } catch (innerErr) {
        return { expenses: [{ valor: 0, data: new Date().toISOString().split('T')[0], descricao: `Anexo de Documento (${file.name})`, categoria: 'Outros', origem: 'pdf' }] };
      }
    }

    if (type === 'audio') {
      if (onProgress) onProgress("Processando áudio via motor nativo...");
      const text = transcript || "";
      const expense = parseTextToExpense(text, 'audio');
      expense.audioUrl = audioUrl;
      return { expenses: [expense] };
    }

    return { expenses: [], error: 'Formato não reconhecido.' };

  } catch (err: any) {
    return { expenses: [], error: err.message || "Erro no processamento." };
  }
};

// Lazy-loaded: Tesseract só é baixado quando o usuário faz OCR de uma imagem
const scanImageLocal = async (file: File, onProgress?: (m: string) => void): Promise<string> => {
  const Tesseract = (await import('tesseract.js')).default;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    Tesseract.recognize(url, 'por', {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(`Escaneando: ${Math.round(m.progress * 100)}% concluído...`);
        }
      }
    }).then(({ data: { text } }) => {
      URL.revokeObjectURL(url);
      resolve(text);
    }).catch(err => {
      URL.revokeObjectURL(url);
      reject(err);
    });
  });
};

// Lazy-loaded: pdfjs-dist só é baixado quando o usuário importa um PDF
const extractPdfTextLocal = async (file: File, onProgress?: (m: string) => void): Promise<string> => {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => (item as any).str);
    fullText += strings.join(' ') + '\n';
  }
  return fullText;
};
