import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProfileSummary {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export const useFamilyProfiles = () => {
  const { familyId } = useAuth();

  return useQuery({
    queryKey: ["familyProfiles", familyId],
    queryFn: async () => {
      if (!familyId) return {};

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("family_id", familyId);

      if (error) throw error;

      return (data || []).reduce<Record<string, ProfileSummary>>((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {});
    },
    enabled: !!familyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
