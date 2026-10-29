import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// ponytail: explicit rollback-test allowlist; add new reviewed tests here, never seeds.
const files = ['identity', 'onboarding', 'assignments', 'consents', 'assessment-drafts', 'teacher-mode', 'practice', 'session-lifecycle', 'private-audio', 'reviews-and-reports', 'post-recording-ai']
  .map(name => `supabase/tests/${name}.sql`);
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--list') {
  console.log(files.join('\n'));
} else if (args.length !== 2 || args[0] !== '--service' || !/^[a-zA-Z0-9_-]{1,64}$/.test(args[1])) {
  console.error('Usage: npm run test:db -- --service <postgres-service-name> (synthetic testing database only), or --list');
  process.exitCode = 1;
} else {
  for (const file of files) {
    const path = fileURLToPath(new URL(`../${file}`, import.meta.url));
    const sql = readFileSync(path, 'utf8').replace(/^\s*--.*$/gm, '').trim();
    if (!/^begin\s*;/i.test(sql) || !/rollback\s*;$/i.test(sql) || /\bcommit\s*;/i.test(sql)) {
      console.error(`Refusing non-rollback test: ${file}`);
      process.exit(1);
    }
  }
  for (const file of files) {
    console.log(`Running ${file}`);
    const result = spawnSync('psql', [
      '-X', '--no-password', '--dbname', `service=${args[1]}`,
      '--set', 'ON_ERROR_STOP=1', '--file', fileURLToPath(new URL(`../${file}`, import.meta.url)),
    ], { stdio: 'inherit', shell: false });
    if (result.error || result.status !== 0) {
      console.error(result.error?.code === 'ENOENT'
        ? 'psql is not installed or not available on PATH.'
        : `Database test failed: ${file}. Remaining tests were not run.`);
      process.exit(result.status || 1);
    }
  }
  console.log('All 11 rollback SQL test files passed. Persistent seeds were excluded.');
}
