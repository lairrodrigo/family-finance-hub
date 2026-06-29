import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CoraEntry } from "@/components/cora/types";
import { fixMojibake } from "@/lib/text";
import type { Database } from "@/integrations/supabase/types";

type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

/**
 * Persiste lançamentos da Cora na tabela `transactions`, respeitando o tipo
 * (income/expense) que a IA extraiu. Espelha a lógica de useSmartImport.confirmAndSave,
 * mas sem hardcodar 'expense' e recebendo as entries direto (sem passar por revisão).
 *
 * PF/PJ é persistido por account_id. O nº de parcelas ainda não tem coluna
 * própria, então é anexado à descrição para não perder a info.
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

      const [{ data: categories }, { data: accounts }] = await Promise.all([
        supabase.from("categories").select("*").or(`family_id.eq.${profile.family_id},is_default.eq.true`),
        supabase
          .from("accounts")
          .select("id, name")
          .eq("family_id", profile.family_id)
          .eq("is_active", true),
      ]);
      const fallbackCategoryId = categories?.[0]?.id;
      const pfAccount = accounts?.find((account) => account.name.toLowerCase() === "pessoa pf");
      const pjAccount = accounts?.find((account) => account.name.toLowerCase() === "empresa pj");

      const payload: TransactionInsert[] = entries.map((e) => {
        const transactionType = e.kind;
        const normalizedEntryCategory = fixMojibake(e.category).toLowerCase();
        const foundCat = categories?.find((c) => (
          (!c.type || c.type === transactionType) &&
          fixMojibake(c.name).toLowerCase().includes(normalizedEntryCategory)
        ));
        const parcela = e.installments ? ` (${e.installments.n}× ${e.installments.of.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})` : "";
        const accountId = e.account === "PJ" ? pjAccount?.id : pfAccount?.id;

        return {
          user_id: user.id,
          created_by: user.id,
          family_id: profile.family_id,
          amount: Math.abs(e.amount),
          type: transactionType,
          description: `${e.label}${parcela}`.trim(),
          date: new Date(e.date).toISOString(),
          category_id: foundCat?.id || fallbackCategoryId,
          account_id: accountId || null,
          payment_type: transactionType === "expense" ? "cash" : null,
        };
      });

      const { data: trxData, error: insertError } = await supabase.from("transactions").insert(payload).select();
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
    } catch (err: unknown) {
      console.error("useCoraPersist: falha ao salvar", err);
      const message = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Falha ao salvar os lançamentos.";
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return { saveEntries, isSaving };
};
