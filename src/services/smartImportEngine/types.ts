export interface NormalizedExpense {
  valor: number;
  data: string; // Formato YYYY-MM-DD
  descricao: string;
  categoria: string;
  origem: 'planilha' | 'imagem' | 'pdf' | 'audio' | 'texto' | 'bancario' | 'desconhecido';
  tipo?: 'income' | 'expense';
  accountOrigin?: 'PF' | 'PJ';
  accountId?: string;
  audioUrl?: string;
}

export type FileType = 'spreadsheet' | 'bank' | 'image' | 'pdf' | 'audio' | 'unknown';

export interface ExtractorResult {
  expenses: NormalizedExpense[];
  error?: string;
}
