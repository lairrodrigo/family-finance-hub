import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  category_id: string;
  user_id: string;
  family_id: string;
  card_id?: string | null;
  payment_type?: "cash" | "credit_card" | null;
  categories?: {
    name: string;
    icon: string;
    color: string;
  };
}

export const useTransactions = (options: { limit?: number; year?: number } = {}) => {
  const { familyId } = useAuth();
  const { limit, year } = options;

  return useQuery({
    queryKey: ["transactions", familyId, limit, year],
    queryFn: async () => {
      if (!familyId) return [];

      let query = supabase
        .from("transactions")
        .select(`
          *,
          categories:category_id (name, icon, color)
        `)
        .eq("family_id", familyId)
        .order("date", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte("date", startDate).lte("date", endDate);
      }

      const { data: txs, error: txError } = await query;

      if (txError) throw txError;
      return txs as any[];
    },
    enabled: !!familyId,
    staleTime: 60 * 1000, // 1 minute
  });
};
