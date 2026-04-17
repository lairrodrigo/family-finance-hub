import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Goal {
  id: string;
  family_id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  category: string | null;
  deadline: string | null;
  is_completed: boolean;
  created_at: string;
}

export const useGoals = () => {
  const { user, familyId } = useAuth();
  const queryClient = useQueryClient();

  const { data: goals, isLoading, error } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user,
  });

  const createGoal = useMutation({
    mutationFn: async (newGoal: Partial<Goal>) => {
      if (!user) throw new Error("User not authenticated");
      if (!familyId) throw new Error("User has no family assigned");

      const { data, error } = await supabase
        .from("goals")
        .insert({
          name: newGoal.name!,
          target_amount: newGoal.target_amount!,
          current_amount: newGoal.current_amount ?? 0,
          category: newGoal.category ?? null,
          deadline: newGoal.deadline ?? null,
          is_completed: newGoal.is_completed ?? false,
          user_id: user.id,
          family_id: familyId,
        })
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Acesso negado: Você não possui permissão para esta ação.");
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const updateGoalProgress = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data, error } = await supabase
        .from("goals")
        .update({ current_amount: amount })
        .eq("id", id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Acesso negado: Você não possui permissão para esta ação.");
      return data[0];
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  return {
    goals,
    isLoading,
    error,
    createGoal: createGoal.mutateAsync,
    isCreating: createGoal.isPending,
    updateGoalProgress: updateGoalProgress.mutateAsync,
  };
};
