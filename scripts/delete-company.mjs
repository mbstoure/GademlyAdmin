/**
 * delete-company.mjs — deletes a specific company and all its users
 * Usage: node scripts/delete-company.mjs "Testing Company"
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://gswkptaolciliaelzdzh.supabase.co';
const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzd2twdGFvbGNpbGlhZWx6ZHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMDE1MDksImV4cCI6MjA4Mzc3NzUwOX0.7AQC_0HIKj3Cz7ZLeGmG3a6iWjHoI-IV4floZgftjbg';
const API_BASE      = `${SUPABASE_URL}/functions/v1/make-server-c6b0f6c0`;
const ADMIN_EMAIL   = 'mbstoure@gmail.com';
const ADMIN_PASS    = process.env.ADMIN_PASS;

const TARGET_NAME   = (process.argv[2] || 'testing company').toLowerCase().trim();

if (!ADMIN_PASS) {
  console.error('Set ADMIN_PASS env var. Example: ADMIN_PASS=xxx node scripts/delete-company.mjs "Testing Company"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  // 1. Sign in as super_admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  if (authError || !authData.session) {
    console.error('❌ Login failed:', authError?.message);
    process.exit(1);
  }
  const token = authData.session.access_token;
  console.log('✅ Logged in as', ADMIN_EMAIL);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. List companies
  const res = await fetch(`${API_BASE}/admin/companies`, { headers });
  const { companies } = await res.json();
  console.log(`\nFound ${companies.length} companies:`);
  companies.forEach(c => console.log(`  - "${c.name}" (${c.id})  users: ${c.userCount}`));

  // 3. Find target
  const target = companies.find(c => c.name?.toLowerCase().includes(TARGET_NAME));
  if (!target) {
    console.error(`\n❌ No company matching "${TARGET_NAME}" found.`);
    console.log('Available:', companies.map(c => c.name).join(', '));
    process.exit(1);
  }

  console.log(`\n🗑️  Deleting "${target.name}" (${target.id}) and its ${target.userCount} users...`);

  // 4. Delete
  const delRes = await fetch(`${API_BASE}/admin/companies/${target.id}`, {
    method: 'DELETE',
    headers,
  });
  const result = await delRes.json();

  if (!delRes.ok) {
    console.error('❌ Delete failed:', result);
    process.exit(1);
  }

  console.log(`✅ "${target.name}" deleted. Users removed from auth: ${result.deletedUsers ?? 'unknown'}`);

  // 5. Verify
  const verify = await fetch(`${API_BASE}/admin/companies`, { headers });
  const { companies: remaining } = await verify.json();
  console.log(`\nRemaining companies (${remaining.length}):`);
  remaining.forEach(c => console.log(`  - "${c.name}"  users: ${c.userCount}`));
}

main().catch(e => { console.error('💥', e.message); process.exit(1); });
