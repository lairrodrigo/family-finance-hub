export interface HistoryEntry {
  id: string;
  user_id: string;
  type: 'planilha' | 'documento' | 'imagem' | 'audio';
  fileName: string;
  processedContent: string;
  userMessage: string;
  systemResponse: string;
  createdAt: number;
  fileUrl: string | null;
}
