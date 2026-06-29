import { NormalizedExpense, ExtractorResult, FileType } from './types';
import { extractSpreadsheet } from './localExtractor';
import { extractMultimodal } from './multimodalExtractor';
import { extractBankStatement } from './bankExtractor';

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

    // Arquivos estruturados usam parser determinístico/local. IA fica reservada
    // para imagem/OCR, áudio/conversa, resumos e diagnósticos.
    if (type === 'spreadsheet') {
      if (onProgress) onProgress("Processando planilha localmente...");
      return extractSpreadsheet(file);
    } else if (type === 'bank') {
      if (onProgress) onProgress("Lendo arquivo bancario...");
      return extractBankStatement(file);
    } else if (type === 'pdf') {
      if (onProgress) onProgress("Lendo PDF localmente...");
      return extractMultimodal(file, type, onProgress, transcript, audioUrl);
    } else {
      if (onProgress) onProgress("Analisando conteúdo...");
      return extractMultimodal(file, type, onProgress, transcript, audioUrl);
    }
  }

  private static detectType(file: File): FileType {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return 'spreadsheet';
    if (['ofx', 'qif', 'qfx'].includes(ext)) return 'bank';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
    if (['mp3', 'wav', 'ogg', 'm4a', 'webm'].includes(ext)) return 'audio';
    return 'unknown';
  }
}

export type { NormalizedExpense, ExtractorResult, FileType } from './types';
