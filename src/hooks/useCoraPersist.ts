import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CoraEntry } from "@/components/cora/types";

/**
 * Persiste lançamentos da Cora na tabela `transactions`, respeitando o tipo
 * (income/expense) que a IA extraiu. Espelha a lógica de useSmartImport.confirmAndSave,
 * mas sem hardcodar 'expense' e recebendo as entries direto (sem passar por revisão).
 *
 * Persiste origin (PF/PJ) — a coluna existe na tabela. O nº de parcelas ainda
 * não tem coluna própria, então é anexado à descrição para não perder a info.
 */
export const useCoraPersist = () => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const saveEntries = async (entries: CoraEntry[]): Promise<boolean> => {
    if (!user || entries.length === 0) return false;
    setIsSaving(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user.id).single();
      if (!profile?.family_id) throw new Error("Usuário não possui uma família vinculada.");

      const { data: categories } = await supabase.from("categories").select("*");
      const fallbackCategoryId = categories?.[0]?.id;

      const payload = entries.map((e) => {
        const foundCat = categories?.find((c) => c.name.toLowerCase().includes(e.category.toLowerCase()));
        const parcela = e.installments ? ` (${e.installments.n}× ${e.installments.of.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})` : "";
        return {
          user_id: user.id,
          created_by: user.id,
          family_id: profile.family_id,
          amount: Math.abs(e.amount),
          type: e.kind, // income | expense — fiel ao que a Cora mostrou
          description: `${e.label}${parcela}`.trim(),
          date: new Date(e.date).toISOString(),
          category_id: foundCat?.id || fallbackCategoryId,
          payment_type: e.installments ? "credit" : "cash",
          origin: e.account, // PF | PJ — fiel ao que a Cora mostrou
          source: "cora",
        };
      });

      const { data: trxData, error: insertError } = await (supabase.from("transactions") as any).insert(payload).select();
      if (insertError) throw insertError;
      if (!trxData || trxData.length === 0) throw new Error("Acesso negado: você não tem permissão para criar transações.");

      await supabase.from("history_entries").insert({
        user_id: user.id,
        type: "documento",
        fileName: "Cora",
        processedContent: JSON.stringify(entries),
        userMessage: `Cora — ${entries.length} lançamento(s)`,
        systemResponse: `Origens: ${[...new Set(entries.map((e) => e.account))].join(", ")}`,
      });

      return true;
    } catch (err: any) {
      console.error("useCoraPersist: falha ao salvar", err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveEntries, isSaving };
};
