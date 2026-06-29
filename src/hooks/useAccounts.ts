import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Account {
  id: string;
  family_id: string;
  user_id: string;
  name: string;
  type: string;
  balance: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
}

export const useAccounts = () => {
  const { familyId } = useAuth();

  return useQuery({
    queryKey: ["accounts", familyId],
    queryFn: async () => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from("accounts")
        .select("id, family_id, user_id, name, type, balance, color, icon, is_active")
        .eq("family_id", familyId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as Account[];
    },
    enabled: !!familyId,
    staleTime: 60 * 1000,
  });
};
