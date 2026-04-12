import { supabase } from './src/integrations/supabase/client';

async function check() {
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error fetching transactions:', error);
  } else {
    console.log('--- DB Verification ---');
    console.log('Transaction Count:', count);
  }
  
  const { data: profile } = await supabase.from('profiles').select('family_id, user_id').limit(1);
  console.log('Sample Profile info:', profile);
}

check();
