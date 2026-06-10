/**
 * set-demo-passwords.mjs
 *
 * Sets each demo user's password to: <their-email>_testing
 * e.g. sarah.mansour@gademly.com  →  sarah.mansour@gademly.com_testing
 *
 * Usage:
 *   ADMIN_PASS=<your-super-admin-password> node scripts/set-demo-passwords.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = 'https://gswkptaolciliaelzdzh.supabase.co';
const ANON_KEY         = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzd2twdGFvbGNpbGlhZWx6ZHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMDE1MDksImV4cCI6MjA4Mzc3NzUwOX0.7AQC_0HIKj3Cz7ZLeGmG3a6iWjHoI-IV4floZgftjbg';
const API_BASE         = `${SUPABASE_URL}/functions/v1/make-server-c6b0f6c0`;
const ADMIN_EMAIL      = 'mbstoure@gmail.com';
const ADMIN_PASS       = process.env.ADMIN_PASS;

// Demo users whose passwords need to be set
const DEMO_USERS = [
  'sarah.mansour@gademly.com',
  'omar.khalid@gademly.com',
  'rania.hassan@gademly.com',
  'tariq.elsayed@gademly.com',
  'layla.chaaban@gademly.com',
];

if (!ADMIN_PASS) {
  console.error('❌  Set ADMIN_PASS environment variable first.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  // 1. Sign in as super_admin
  console.log(`🔐  Signing in as ${ADMIN_EMAIL}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  if (authError || !authData?.session) {
    console.error('❌  Login failed:', authError?.message);
    process.exit(1);
  }
  const token = authData.session.access_token;
  console.log('✅  Logged in.\n');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // 2. Fetch all KV users (to get emails→IDs mapping)
  console.log('🔍  Fetching KV users...');
  const kvRes  = await fetch(`${API_BASE}/admin/users`, { headers });
  const { users: kvUsers = [] } = await kvRes.json();

  // 3. Fetch all Supabase Auth users (real UUIDs)
  console.log('🔍  Fetching Supabase Auth users...');
  const authRes  = await fetch(`${API_BASE}/admin/auth-users`, { headers });
  const { users: authUsers = [] } = authRes.ok ? await authRes.json() : {};
  console.log(`    Auth users found: ${authUsers.length}\n`);

  // 4. Process each demo user
  for (const email of DEMO_USERS) {
    const newPassword = `${email}_testing`;
    const lc = email.toLowerCase();

    // Try to find real Auth UUID first
    const authUser = authUsers.find(u => u.email?.toLowerCase() === lc);
    // Also find KV record
    const kvUser = kvUsers.find(u => u.email?.toLowerCase() === lc);

    if (authUser) {
      // User exists in Auth — just update password
      console.log(`🔑  Updating password for ${email} (Auth ID: ${authUser.id})...`);
      const res = await fetch(`${API_BASE}/admin/users/${authUser.id}/set-password`, {
        method: 'POST', headers, body: JSON.stringify({ password: newPassword }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`    ❌  Failed: ${result.error || res.statusText}`);
      } else {
        console.log(`    ✅  Done  →  password: ${newPassword}`);
        // If KV record has wrong ID, remap it
        if (kvUser && kvUser.id !== authUser.id) {
          console.log(`    🔄  Remapping KV record ${kvUser.id} → ${authUser.id}`);
          await fetch(`${API_BASE}/admin/remap-user`, {
            method: 'POST', headers, body: JSON.stringify({ oldId: kvUser.id, newId: authUser.id, email }),
          });
        }
      }
    } else {
      // User doesn't exist in Auth — create them with password
      console.log(`➕  Creating Auth user for ${email}...`);
      const res = await fetch(`${API_BASE}/admin/create-auth-user`, {
        method: 'POST', headers, body: JSON.stringify({ email, password: newPassword }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`    ❌  Failed: ${result.error || res.statusText}`);
      } else {
        const newAuthId = result.userId;
        console.log(`    ✅  Created  →  Auth ID: ${newAuthId}, password: ${newPassword}`);
        // Remap KV record if it has a fake ID
        if (kvUser && kvUser.id !== newAuthId) {
          console.log(`    🔄  Remapping KV record ${kvUser.id} → ${newAuthId}`);
          await fetch(`${API_BASE}/admin/remap-user`, {
            method: 'POST', headers, body: JSON.stringify({ oldId: kvUser.id, newId: newAuthId, email }),
          });
        }
      }
    }
  }

  console.log('\n🎉  All done!');
}

main().catch(e => { console.error('\n💥  Fatal error:', e.message); process.exit(1); });
