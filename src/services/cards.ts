import { supabase } from "@/integrations/supabase/client";

export async function fetchCards(userId: string) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}
