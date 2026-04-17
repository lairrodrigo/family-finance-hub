import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nolvjgquuckburmtqzqn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbHZqZ3F1dWNrYnVybXRxenFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDQxMDgsImV4cCI6MjA5MTUyMDEwOH0.RnHBLojMRinhq2Eeg9lc3bY0k3kipCDyGtys81diGAU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const users = {
  admin: '4fab34c3-dd76-4cb6-a6af-9c16a07244d1',
  member: '168d9877-efdc-4326-9230-6def53a5eb7b',
  viewer: '1dc07630-7f9a-4e9d-b171-719f19b988a6'
};

async function setup() {
  console.log("Creating Audit Family...");
  const { data: family, error: fError } = await supabase
    .from('families')
    .insert([{ name: 'Audit Lab Family' }])
    .select()
    .single();

  if (fError) {
    console.error("Error creating family:", fError.message);
    return;
  }

  const familyId = family.id;
  console.log(`Family Created: ${familyId}`);

  // Link users
  console.log("Linking users...");
  
  await supabase.from('profiles').update({ family_id: familyId }).eq('user_id', users.admin);
  await supabase.from('user_roles').insert([{ user_id: users.admin, family_id: familyId, role: 'admin' }]);

  await supabase.from('profiles').update({ family_id: familyId }).eq('user_id', users.member);
  await supabase.from('user_roles').insert([{ user_id: users.member, family_id: familyId, role: 'member' }]);

  await supabase.from('profiles').update({ family_id: familyId }).eq('user_id', users.viewer);
  await supabase.from('user_roles').insert([{ user_id: users.viewer, family_id: familyId, role: 'viewer' }]);

  console.log("Setup Complete.");
}

setup();
