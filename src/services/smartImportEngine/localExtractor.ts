import * as XLSX from 'xlsx';
import { NormalizedExpense, ExtractorResult } from './types';

export const extractSpreadsheet = async (file: File): Promise<ExtractorResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);
        const expenses: NormalizedExpense[] = [];

        // Função auxiliar robusta para achar colunas por关键词
        const findVal = (row: any, keywords: string[]) => {
          const key = Object.keys(row).find(k => 
            keywords.some(kw => k.toLowerCase().trim() === kw.toLowerCase()) ||
            keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase()))
          );
          return key ? row[key] : null;
        };
        
        for (const row of rawJson) {
          const valorRaw = findVal(row, ['valor', 'preço', 'custo', 'amount', 'total', 'price']);
          let valor = 0;
          if (typeof valorRaw === 'number') {
            valor = valorRaw;
          } else if (typeof valorRaw === 'string') {
            valor = parseFloat(valorRaw.replace(/[^\d.,]/g, '').replace(',', '.'));
          }

          if (isNaN(valor) || valor === 0) continue;

          let dataISO = new Date().toISOString().split('T')[0];
          const dataRaw = findVal(row, ['data', 'date', 'vencimento', 'dia']);
          if (dataRaw instanceof Date) {
            dataISO = dataRaw.toISOString().split('T')[0];
          } else if (typeof dataRaw === 'string') {
            const parsed = new Date(dataRaw);
            if (!isNaN(parsed.getTime())) dataISO = parsed.toISOString().split('T')[0];
          }

          const descricao = findVal(row, ['descrição', 'nome', 'item', 'description', 'produto']) || '';
          const categoria = findVal(row, ['categoria', 'category', 'tipo', 'setor']) || 'Outros';

          expenses.push({
            valor: Math.abs(valor),
            data: dataISO,
            descricao: String(descricao).trim(),
            categoria: String(categoria).trim(),
            origem: 'planilha'
          });
        }
        
        resolve({ expenses });
      } catch (err: any) {
        resolve({ expenses: [], error: `Falha ao ler planilha: ${err.message}` });
      }
    };
    
    reader.onerror = () => {
      resolve({ expenses: [], error: "Erro ao carregar o arquivo" });
    };
    
    reader.readAsBinaryString(file);
  });
};
