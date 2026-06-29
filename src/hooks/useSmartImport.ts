import { useRef, useState } from 'react';
import { SmartImportEngine, NormalizedExpense } from '@/services/smartImportEngine';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fixMojibake } from '@/lib/text';

export interface FileWithTranscript {
  file: File;
  transcript?: string;
  audioUrl?: string; // URL temporária para playback
}

type InsertableTransactionsTable = {
  insert: (payload: unknown) => {
    select: () => Promise<{
      data: unknown[] | null;
      error: { message?: string } | null;
    }>;
  };
};

export const useSmartImport = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileWithTranscript[]>([]);
  
  // Estados de Processamento
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const activeRunRef = useRef(0);
  
  // Estado de Revisão e Garantia
  const [extractedExpenses, setExtractedExpenses] = useState<NormalizedExpense[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);

  // Manipulação de Arquivos Básica
  const addFiles = (newFiles: File[], transcript?: string, audioUrl?: string) => {
    const valid = newFiles.filter(f => f.size <= 10 * 1024 * 1024);
    if (valid.length < newFiles.length) toast.error("Arquivos > 10MB foram ignorados.");
    
    const wrapped = valid.map(f => ({ file: f, transcript, audioUrl }));
    setImportError(null);
    setFiles(prev => [...prev, ...wrapped]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Etapa 1: Extração (Isolada)
  const extractData = async () => {
    if (files.length === 0) {
      toast.error("Adicione um arquivo primeiro.");
      return;
    }

    setIsProcessing(true);
    setProgressMessage("Processando arquivos...");
    setImportError(null);
    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    
    let allExpenses: NormalizedExpense[] = [];
    let hasError = false;

    for (const item of files) {
      try {
        const result = await SmartImportEngine.processFile(
          item.file, 
          (msg) => {
            if (activeRunRef.current === runId) setProgressMessage(msg);
          },
          item.transcript,
          item.audioUrl
        );

        if (activeRunRef.current !== runId) return;
        
        if (result.error) {
          const message = `Erro em ${item.file.name}: ${result.error}`;
          toast.error(message);
          setImportError(message);
          hasError = true;
          continue;
        }

        allExpenses = [...allExpenses, ...result.expenses];
      } catch (err: unknown) {
        if (activeRunRef.current !== runId) return;

        const details = err instanceof Error ? err.message : "Erro desconhecido";
        const message = `Falha lendo ${item.file.name}: ${details}`;
        toast.error(message);
        setImportError(message);
        hasError = true;
      }
    }

    if (activeRunRef.current !== runId) return;

    setIsProcessing(false);
    setProgressMessage(null);

    if (allExpenses.length > 0) {
      setExtractedExpenses(allExpenses);
      setIsReviewing(true);
    } else if (!hasError) {
      toast.error("Nenhum dado financeiro lido nos arquivos.");
    }
  };

  // Funções para ajustar dados durante a revisão
  const updateExpense = (index: number, field: keyof NormalizedExpense, value: NormalizedExpense[keyof NormalizedExpense]) => {
    const copy = [...extractedExpenses];
    copy[index] = { ...copy[index], [field]: value };
    setExtractedExpenses(copy);
  };

  const removeExpense = (index: number) => {
    setExtractedExpenses(extractedExpenses.filter((_, i) => i !== index));
  };

  // Carrega despesas já extraídas (ex.: vindas de parser de texto) direto na fase de revisão
  const loadExpensesForReview = (expenses: NormalizedExpense[]) => {
    setExtractedExpenses(expenses);
    setIsReviewing(true);
  };

  // Etapa 2: Confirmação e Inserção no Banco
  const confirmAndSave = async (): Promise<boolean> => {
    if (!user) return false;
    if (extractedExpenses.length === 0) return false;

    setIsProcessing(true);
    setProgressMessage("Salvando no banco de dados...");

    try {
      const { data: profile } = await supabase.from('profiles').select('family_id').eq('user_id', user.id).single();
      if (!profile?.family_id) throw new Error("Usuário não possui uma família vinculada.");

      const [{ data: categories }, { data: accounts }] = await Promise.all([
        supabase.from('categories').select('*').or(`family_id.eq.${profile.family_id},is_default.eq.true`),
        supabase
          .from('accounts')
          .select('id, name')
          .eq('family_id', profile.family_id)
          .eq('is_active', true),
      ]);
      const fallbackCategoryId = categories?.[0]?.id;
      const pfAccount = accounts?.find(account => account.name.toLowerCase() === 'pessoa pf');
      const pjAccount = accounts?.find(account => account.name.toLowerCase() === 'empresa pj');

      const payload = extractedExpenses.map(exp => {
        const transactionType = exp.tipo || 'expense';
        const normalizedExpenseCategory = fixMojibake(exp.categoria).toLowerCase();
        const foundCat = categories?.find(c => (
          (!c.type || c.type === transactionType) &&
          fixMojibake(c.name).toLowerCase().includes(normalizedExpenseCategory)
        ));
        const accountId = exp.accountId || (exp.accountOrigin === 'PJ' ? pjAccount?.id : pfAccount?.id);
        
        return {
          user_id: user.id,
          created_by: user.id,
          family_id: profile.family_id,
          amount: Math.abs(exp.valor),
          type: transactionType,
          description: exp.descricao,
          date: new Date(exp.data).toISOString(),
          category_id: foundCat?.id || fallbackCategoryId,
          account_id: accountId || null,
          payment_type: transactionType === 'expense' ? 'cash' : null,
        };
      });

      const transactionsTable = supabase.from('transactions') as unknown as InsertableTransactionsTable;
      const { data: trxData, error: insertError } = await transactionsTable.insert(payload).select();
      if (insertError) throw insertError;
      if (!trxData || trxData.length === 0) throw new Error("Acesso negado: Você não possui permissão para importar transações.");

      const { data: histData, error: histError } = await supabase.from('history_entries').insert({
        user_id: user.id,
        type: 'documento',
        fileName: files.map(f => f.file.name).join(', '),
        processedContent: JSON.stringify(extractedExpenses),
        userMessage: `Importação Inteligente Local (${extractedExpenses.length} itens)`,
        systemResponse: `Origens: ${[...new Set(extractedExpenses.map(e => e.origem))].join(', ')}`
      }).select();
      
      if (histError) throw histError;
      if (!histData || histData.length === 0) throw new Error("Acesso negado: Falha ao registrar log de importação.");

      toast.success("Gastos importados com sucesso!");
      resetFull();
      return true;

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao salvar: ${message}`);
      return false;
    } finally {
      setIsProcessing(false);
      setProgressMessage(null);
    }
  };

  const resetFull = () => {
    // Limpar URLs de blob para evitar memory leak
    files.forEach(f => { if (f.audioUrl) URL.revokeObjectURL(f.audioUrl); });
    
    setFiles([]);
    setExtractedExpenses([]);
    setIsReviewing(false);
    setIsProcessing(false);
    setProgressMessage(null);
    setImportError(null);
    activeRunRef.current += 1;
  };

  return {
    files,
    addFiles,
    removeFile,
    isProcessing,
    progressMessage,
    importError,
    isReviewing,
    extractedExpenses,
    updateExpense,
    removeExpense,
    extractData,
    confirmAndSave,
    resetFull,
    loadExpensesForReview
  };
};
