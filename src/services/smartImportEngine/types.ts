export interface NormalizedExpense {
  valor: number;
  data: string; // Formato YYYY-MM-DD
  descricao: string;
  categoria: string;
  origem: 'planilha' | 'imagem' | 'pdf' | 'audio' | 'desconhecido';
  audioUrl?: string;
}

export type FileType = 'spreadsheet' | 'image' | 'pdf' | 'audio' | 'unknown';

export interface ExtractorResult {
  expenses: NormalizedExpense[];
  error?: string;
}
