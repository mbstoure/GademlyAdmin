/**
 * fix-demo-role.mjs
 *
 * Resets demo@gademly.com back to 'company_admin' role.
 * Also clears any custom roleId so the system role takes effect.
 *
 * Usage:
 *   ADMIN_PASS=<your-super-admin-password> node scripts/fix-demo-role.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://gswkptaolciliaelzdzh.supabase.co';
const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzd2twdGFvbGNpbGlhZWx6ZHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMDE1MDksImV4cCI6MjA4Mzc3NzUwOX0.7AQC_0HIKj3Cz7ZLeGmG3a6iWjHoI-IV4floZgftjbg';
const API_BASE      = `${SUPABASE_URL}/functions/v1/make-server-c6b0f6c0`;
const ADMIN_EMAIL   = 'mbstoure@gmail.com';
const ADMIN_PASS    = process.env.ADMIN_PASS;

const TARGET_EMAIL  = 'demo@gademly.com';
const TARGET_ROLE   = 'company_admin';

if (!ADMIN_PASS) { console.error('❌ Set ADMIN_PASS env var'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  console.log(`🔐 Signing in as ${ADMIN_EMAIL}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  if (authError || !authData?.session) {
    console.error('❌ Login failed:', authError?.message);
    process.exit(1);
  }
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authData.session.access_token}`,
  };
  console.log('✅ Logged in.\n');

  // Fetch all users and find demo@gademly.com
  console.log('📋 Fetching user list...');
  const { users = [] } = await fetch(`${API_BASE}/admin/users`, { headers }).then(r => r.json());

  const target = users.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());
  if (!target) {
    console.error(`❌ User not found: ${TARGET_EMAIL}`);
    console.log('Available emails:', users.map(u => u.email).join(', '));
    process.exit(1);
  }

  console.log(`👤 Found: ${target.email}`);
  console.log(`   Current role:   ${target.role}`);
  console.log(`   Current roleId: ${target.roleId ?? '(none)'}`);
  console.log(`   Status:         ${target.status}`);
  console.log(`\n🔧 Resetting role → ${TARGET_ROLE} and clearing roleId...`);

  const res = await fetch(`${API_BASE}/admin/users/${target.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      role:   TARGET_ROLE,
      roleId: null,          // clear any custom role assignment
      status: 'active',      // ensure account is active while we're here
    }),
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`❌ Update failed: ${result.error || res.statusText}`);
    process.exit(1);
  }

  console.log(`✅ Role successfully reset!`);
  console.log(`   role   → ${TARGET_ROLE}`);
  console.log(`   roleId → null`);
  console.log(`   status → active`);
  console.log('\n🎉 Done! demo@gademly.com can now log in as company_admin.');
  console.log('   The change takes effect immediately on next login or within 60s if already logged in.');
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
