import { NormalizedExpense, ExtractorResult, FileType } from './types';
import { extractSpreadsheet } from './localExtractor';
import { extractMultimodal } from './multimodalExtractor';

export class SmartImportEngine {
  
  static async processFile(
    file: File, 
    onProgress?: (msg: string) => void,
    transcript?: string,
    audioUrl?: string
  ): Promise<ExtractorResult> {

    const type = this.detectType(file);
    
    if (type === 'unknown') {
      return { expenses: [], error: `Formato de arquivo não suportado: ${file.name}` };
    }

    if (type === 'spreadsheet') {
      if (onProgress) onProgress("Processando planilha localmente...");
      return extractSpreadsheet(file);
    } else {
      if (onProgress) onProgress("Analisando conteúdo...");
      return extractMultimodal(file, type, onProgress, transcript, audioUrl);
    }
  }

  private static detectType(file: File): FileType {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return 'spreadsheet';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
    if (['mp3', 'wav', 'ogg', 'm4a', 'webm'].includes(ext)) return 'audio';
    return 'unknown';
  }
}

export type { NormalizedExpense, ExtractorResult, FileType } from './types';
