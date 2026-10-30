import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// ponytail: minimal ordered runner for the synthetic Supabase project; add a real tool (Supabase CLI) before production.
// Usage: node scripts/migrate-db.mjs --service <name> [--baseline <last-already-applied-prefix>] | --list
const dir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const files = readdirSync(dir).filter(f => /^\d{12}_[a-z0-9_]+\.sql$/.test(f)).sort();
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

if (args[0] === '--list') {
  console.log(files.join('\n'));
  process.exit(0);
}
const service = flag('--service');
const baseline = flag('--baseline');
if (!service || !/^[a-zA-Z0-9_-]{1,64}$/.test(service) || (baseline !== undefined && !/^\d{12}$/.test(baseline))) {
  console.error('Usage: node scripts/migrate-db.mjs --service <name> [--baseline <12-digit migration prefix>] | --list');
  process.exit(1);
}

const psql = (extra, input) => spawnSync('psql', ['-X', '--no-password', '--dbname', `service=${service}`,
  '--set', 'ON_ERROR_STOP=1', ...extra], { encoding: 'utf8', input, shell: false });
const fail = (r, msg) => {
  console.error(r.error?.code === 'ENOENT' ? 'psql is not installed or not on PATH.' : (msg + '\n' + (r.stderr || '')));
  process.exit(r.status || 1);
};

let r = psql([], `create table if not exists public.applied_migrations(name text primary key, applied_at timestamptz not null default now());
alter table public.applied_migrations enable row level security;
revoke all on public.applied_migrations from public, anon, authenticated;`);
if (r.status !== 0) fail(r, 'Cannot reach the database or create the tracking table.');

if (baseline) {
  const old = files.filter(f => f.slice(0, 12) <= baseline);
  const values = old.map(f => `('${f}')`).join(',');
  r = psql([], `insert into public.applied_migrations(name) values ${values} on conflict do nothing;`);
  if (r.status !== 0) fail(r, 'Baseline failed.');
  console.log(`Baselined ${old.length} migrations as already applied (not executed).`);
}

r = psql(['-At', '-c', 'select name from public.applied_migrations']);
if (r.status !== 0) fail(r, 'Cannot read applied migrations.');
const done = new Set(r.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean));
const pending = files.filter(f => !done.has(f));
if (!pending.length) { console.log('Nothing to apply.'); process.exit(0); }

for (const f of pending) {
  console.log(`Applying ${f}`);
  r = psql(['--file', dir + f]);
  if (r.status !== 0) fail(r, `Failed: ${f}. Later migrations were not run. If it says an object already exists, it was applied earlier: rerun with --baseline ${f.slice(0, 12)} to mark it and everything before it as applied.`);
  r = psql([], `insert into public.applied_migrations(name) values ('${f}') on conflict do nothing;`);
  if (r.status !== 0) fail(r, `Applied ${f} but could not record it. Do not rerun blindly; use --baseline ${f.slice(0, 12)}.`);
}
console.log(`Applied ${pending.length} migration(s).`);
