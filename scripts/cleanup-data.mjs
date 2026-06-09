/**
 * cleanup-data.mjs
 *
 * Deletes all companies and users EXCEPT 'Gademly Education Consultancy'
 * and its users. Calls the admin API so Supabase Auth is also revoked.
 *
 * Usage:
 *   ADMIN_TOKEN=<your-super-admin-jwt> node scripts/cleanup-data.mjs
 *
 * The ADMIN_TOKEN is your super_admin JWT — copy it from the admin
 * portal's browser DevTools (Application → Local Storage → supabase.auth.token → access_token)
 * or from the Supabase dashboard.
 */

const API_BASE = 'https://gswkptaolciliaelzdzh.supabase.co/functions/v1/make-server-c6b0f6c0';
const KEEP_COMPANY_NAME = 'Gademly Education Consultancy';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
  console.error('❌  Set ADMIN_TOKEN environment variable first.');
  console.error('    Example: ADMIN_TOKEN=eyJ... node scripts/cleanup-data.mjs');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${ADMIN_TOKEN}`,
};

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`${method} ${path} → ${res.status}: ${err.error || JSON.stringify(err)}`);
  }
  return res.json();
}

async function main() {
  console.log('🔍  Fetching companies...');
  const { companies } = await api('GET', '/admin/companies');
  console.log(`    Found ${companies.length} companies.`);

  // Identify the one to keep
  const keepCompany = companies.find(
    (c) => c.name?.trim().toLowerCase() === KEEP_COMPANY_NAME.toLowerCase()
  );
  if (!keepCompany) {
    console.error(`❌  Could not find company named "${KEEP_COMPANY_NAME}". Aborting to be safe.`);
    console.log('    Companies found:', companies.map((c) => c.name).join(', '));
    process.exit(1);
  }
  console.log(`✅  Will KEEP company: "${keepCompany.name}" (${keepCompany.id})`);

  const toDelete = companies.filter((c) => c.id !== keepCompany.id);
  console.log(`🗑️   Will DELETE ${toDelete.length} companies:`);
  toDelete.forEach((c) => console.log(`     - ${c.name} (${c.id})`));

  if (toDelete.length === 0) {
    console.log('\n✅  Nothing to delete. Database is already clean.');
  } else {
    console.log('\n⏳  Deleting companies (this also deletes their users from Supabase Auth)...');
    for (const company of toDelete) {
      try {
        const result = await api('DELETE', `/admin/companies/${company.id}`);
        console.log(`    ✅  Deleted "${company.name}" — ${result.deletedUsers ?? 0} users revoked from Auth.`);
      } catch (e) {
        console.error(`    ❌  Failed to delete "${company.name}": ${e.message}`);
      }
    }
  }

  // Now clean up any orphaned users not belonging to the kept company
  console.log('\n🔍  Fetching remaining users...');
  const { users } = await api('GET', '/admin/users');
  const orphaned = users.filter(
    (u) => u.companyId !== keepCompany.id && u.role !== 'super_admin'
  );
  console.log(`    Found ${orphaned.length} orphaned users to delete.`);

  for (const u of orphaned) {
    try {
      await api('DELETE', `/admin/users/${u.id}`);
      console.log(`    ✅  Deleted user: ${u.email || u.fullName || u.id}`);
    } catch (e) {
      console.error(`    ❌  Failed to delete user ${u.email || u.id}: ${e.message}`);
    }
  }

  console.log('\n✅  Cleanup complete. Fetching final state...');
  const final = await api('GET', '/admin/companies');
  console.log(`    Companies remaining: ${final.companies.length}`);
  final.companies.forEach((c) => console.log(`     - ${c.name} (users: ${c.userCount})`));
}

main().catch((e) => {
  console.error('\n💥  Fatal error:', e.message);
  process.exit(1);
});
