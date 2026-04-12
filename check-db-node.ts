import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nolvjgquuckburmtqzqn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbHZqZ3F1dWNrYnVybXRxenFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDQxMDgsImV4cCI6MjA5MTUyMDEwOH0.RnHBLojMRinhq2Eeg9lc3bY0k3kipCDyGtys81diGAU'
);

async function check() {
  console.log('--- Checking DB state (Node) ---');
  
  // Checking cards as a proxy
  const { data: cards, error: cardsError } = await supabase.from('cards').select('*');
  console.log('Cards found:', cards?.length || 0);
  if (cardsError) console.error('Cards Error:', cardsError);

  // Checking transactions
  const { count, error: txError } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  console.log('Total Transactions in DB:', count || 0);
  if (txError) console.error('TX Error:', txError);

  // Check roles
  const { data: roles } = await supabase.from('user_roles').select('*');
  console.log('Roles found:', roles);
}

check();
