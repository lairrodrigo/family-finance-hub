import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dmqmbtiucatqhonzgoar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ez-PA_zAUa1TjZTSrV_Q-Q_UTXUyv3q";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const users = [
  { email: 'audit_admin@test.com', password: 'Validation123!', name: 'Admin Auditor' },
  { email: 'audit_member@test.com', password: 'Validation123!', name: 'Member Auditor' },
  { email: 'audit_viewer@test.com', password: 'Validation123!', name: 'Viewer Auditor' }
];

async function provision() {
  for (const user of users) {
    console.log(`Provisioning ${user.email}...`);
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: { full_name: user.name }
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`User ${user.email} already exists.`);
      } else {
        console.error(`Error provisioning ${user.email}:`, error.message);
      }
    } else {
      console.log(`Successfully provisioned ${user.email}. ID: ${data.user?.id}`);
    }
  }
}

provision();
