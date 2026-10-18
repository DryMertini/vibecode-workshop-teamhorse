import { spawnSync } from 'node:child_process';
const input = process.argv[2];
if (!input) { console.error('Usage: npm run smoke -- https://YOUR-ASSIGNED-URL'); process.exit(1); }
try {
  const base = new URL(input);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Use an HTTP(S) URL without embedded credentials');
  const response = await fetch(new URL('/api/health', base), { signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error(`Health returned HTTP ${response.status}`);
  const health = await response.json();
  if (health.ok !== true || typeof health.revision !== 'string') throw new Error('Unexpected health response');
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  const expected = git.status === 0 ? git.stdout.trim() : null;
  if (expected && health.revision !== expected) throw new Error(`Revision differs: expected ${expected}, received ${health.revision}`);
  console.log(`OK  ${base.origin} serves revision ${health.revision}`);
  if (!expected) console.log('CHECK  No local Git revision; served revision was not compared.');
  console.log('NEXT  Open the URL on another device and complete the core task.');
} catch (error) { console.error(`FAIL  ${error.message}`); process.exitCode = 1; }
