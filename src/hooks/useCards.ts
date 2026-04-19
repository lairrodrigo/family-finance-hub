import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Card {
  id: string;
  name: string;
  last_four: string | null;
  brand: string | null;
  credit_limit: number | null;
  color: string | null;
  family_id: string;
  is_active: boolean;
}

export const useCards = () => {
  const { familyId } = useAuth();

  return useQuery({
    queryKey: ["cards", familyId],
    queryFn: async () => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Card[];
    },
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
