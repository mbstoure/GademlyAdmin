/**
 * activate-demo-users.mjs
 *
 * Updates the KV profile status for each demo user from 'invited' → 'active'
 * so they can log in without hitting access gates.
 *
 * Usage:
 *   ADMIN_PASS=<your-super-admin-password> node scripts/activate-demo-users.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gswkptaolciliaelzdzh.supabase.co';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzd2twdGFvbGNpbGlhZWx6ZHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMDE1MDksImV4cCI6MjA4Mzc3NzUwOX0.7AQC_0HIKj3Cz7ZLeGmG3a6iWjHoI-IV4floZgftjbg';
const API_BASE    = `${SUPABASE_URL}/functions/v1/make-server-c6b0f6c0`;
const ADMIN_EMAIL = 'mbstoure@gmail.com';
const ADMIN_PASS  = process.env.ADMIN_PASS;

const DEMO_EMAILS = [
  'sarah.mansour@gademly.com',
  'omar.khalid@gademly.com',
  'rania.hassan@gademly.com',
  'tariq.elsayed@gademly.com',
  'layla.chaaban@gademly.com',
];

if (!ADMIN_PASS) { console.error('❌ Set ADMIN_PASS env var'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  console.log(`🔐 Signing in as ${ADMIN_EMAIL}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASS });
  if (authError || !authData?.session) { console.error('❌ Login failed:', authError?.message); process.exit(1); }
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.session.access_token}` };
  console.log('✅ Logged in.\n');

  // Get all KV users
  const { users = [] } = await fetch(`${API_BASE}/admin/users`, { headers }).then(r => r.json());

  for (const email of DEMO_EMAILS) {
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) { console.warn(`⚠️  Not found in KV: ${email}`); continue; }

    console.log(`🔓 Activating ${email} (KV ID: ${user.id}, current status: ${user.status})...`);
    const res = await fetch(`${API_BASE}/admin/users/${user.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'active' }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`   ❌ Failed: ${result.error || res.statusText}`);
    } else {
      console.log(`   ✅ Activated — status is now: active`);
    }
  }
  console.log('\n🎉 Done!');
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
