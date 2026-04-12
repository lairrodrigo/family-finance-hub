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
  const { user } = useAuth();
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

      // Get family_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.family_id) throw new Error("User has no family assigned");

      const { data, error } = await supabase
        .from("goals")
        .insert([{
          ...newGoal,
          user_id: user.id,
          family_id: profile.family_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
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
        .select()
        .single();

      if (error) throw error;
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
