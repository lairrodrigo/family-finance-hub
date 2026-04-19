import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: 'expense' | 'income';
  is_default: boolean;
  family_id: string | null;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    // Keep categories in cache for 1 hour, they don't change often
    staleTime: 60 * 60 * 1000,
  });
};
