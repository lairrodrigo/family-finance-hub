import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nolvjgquuckburmtqzqn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbHZqZ3F1dWNrYnVybXRxenFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDQxMDgsImV4cCI6MjA5MTUyMDEwOH0.RnHBLojMRinhq2Eeg9lc3bY0k3kipCDyGtys81diGAU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAudit() {
  console.log("=== RBAC PRODUCTION-GRADE AUDIT START ===");

  const familyId = "dcf574b7-4bba-42c0-9541-d2c5052a7611"; // Captured from screenshot or expected

  // 1. LOGIN AS VIEWER
  console.log("\n[TEST 1] Authenticating as VIEWER (audit_viewer@test.com)...");
  const { data: vSession, error: vAuthError } = await supabase.auth.signInWithPassword({
    email: 'audit_viewer@test.com',
    password: 'Validation123!'
  });

  if (vAuthError) {
    console.error("Viewer Auth Failed:", vAuthError.message);
  } else {
    console.log("Viewer JWT acquired.");
    
    // ATTEMPT 1: INSERT TRANSACTION
    console.log("Attempting illegal INSERT on 'transactions' as VIEWER...");
    const { data: vData, error: vInsertError } = await supabase
      .from('transactions')
      .insert([{ 
        amount: 100, 
        type: 'expense', 
        category_id: '4399e578-831e-45fa-a92c-628d01115e4a',
        family_id: familyId,
        user_id: vSession.user?.id
      }])
      .select();
    
    if (vInsertError || (vData && vData.length === 0)) {
      console.log("RESULT: Correctly Blocked by RLS.");
      if (vInsertError) console.log("ERROR:", vInsertError.message);
      else console.log("INFO: 0 rows modified (Silent RLS Block).");
    } else {
      console.error("CRITICAL FAILURE: Viewer was able to insert a transaction!");
    }
  }

  // 2. LOGIN AS MEMBER
  console.log("\n[TEST 2] Authenticating as MEMBER (audit_member@test.com)...");
  const { data: mSession, error: mAuthError } = await supabase.auth.signInWithPassword({
    email: 'audit_member@test.com',
    password: 'Validation123!'
  });

  if (mAuthError) {
    console.error("Member Auth Failed:", mAuthError.message);
  } else {
    console.log("Member JWT acquired.");

    // ATTEMPT 2: UPDATE USER_ROLES (Role Escalation)
    console.log("Attempting illegal ROLE ESCALATION (update self to admin)...");
    const { data: mData, error: mRoleError } = await supabase
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', mSession.user?.id)
      .select();

    if (mRoleError || (mData && mData.length === 0)) {
      console.log("RESULT: Correctly Blocked by RLS.");
      if (mRoleError) console.log("ERROR:", mRoleError.message);
      else console.log("INFO: 0 rows modified (Silent RLS Block).");
    } else {
      console.error("CRITICAL FAILURE: Member was able to escalate their own role!");
    }
  }

  console.log("\n=== RBAC AUDIT TERMINATED ===");
}

runAudit();
