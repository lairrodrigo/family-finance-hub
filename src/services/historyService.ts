import { supabase } from '@/integrations/supabase/client';
import { HistoryEntry } from '@/types/history';

export const historyService = {
  async createHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): Promise<HistoryEntry> {
    try {
      const { data, error } = await supabase
        .from('history_entries')
        .insert([{
          user_id: entry.user_id,
          type: entry.type,
          fileName: entry.fileName,
          processedContent: entry.processedContent,
          userMessage: entry.userMessage,
          systemResponse: entry.systemResponse,
          fileUrl: entry.fileUrl
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        createdAt: new Date(data.createdAt).getTime()
      } as HistoryEntry;
    } catch (error: any) {
      console.error("Error creating history entry:", error);
      throw new Error(error.message || "Erro ao salvar histórico no banco de dados.");
    }
  },

  async getHistoryEntries(userId: string): Promise<HistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('history_entries')
        .select('*')
        .eq('user_id', userId)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      return data.map(entry => ({
        ...entry,
        createdAt: new Date(entry.createdAt).getTime()
      })) as HistoryEntry[];
    } catch (error: any) {
      console.error("Error fetching history entries:", error);
      throw new Error("Erro ao carregar histórico. Verifique sua conexão.");
    }
  },

  async deleteHistoryEntry(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('history_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error deleting history entry:", error);
      throw new Error("Erro ao deletar histórico. Tente novamente.");
    }
  }
};
