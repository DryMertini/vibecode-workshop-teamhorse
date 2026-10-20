import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';

export function isGuestEnvironment() {
  try {
    return userInfo().username === 'vc-team' && existsSync('/etc/vc-guest-contract');
  } catch {
    return false;
  }
}

export function resolveSmokeTarget(input, isGuest = isGuestEnvironment()) {
  const base = new URL(input);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('Use an HTTP(S) URL without embedded credentials');
  }
  const isLoopback = ['127.0.0.1', 'localhost'].includes(base.hostname);
  if (isGuest && !isLoopback) {
    return {
      targetUrl: new URL('/api/health', 'http://127.0.0.1:3000'),
      displayOrigin: 'http://127.0.0.1:3000',
      note: 'NOTE  Running on the workshop guest. Verified local http://127.0.0.1:3000/api/health because Cloudflare challenges outbound requests to *.intra.land from this server. Run smoke on your laptop to verify the public HTTPS route.',
    };
  }
  return {
    targetUrl: new URL('/api/health', base),
    displayOrigin: base.origin,
    note: null,
  };
}

export async function runSmoke(args = process.argv.slice(2), { isGuest = isGuestEnvironment() } = {}) {
  const input = args[0];
  if (!input) {
    console.error('Usage: npm run smoke -- https://YOUR-ASSIGNED-URL');
    process.exitCode = 1;
    return;
  }
  const { targetUrl, displayOrigin, note } = resolveSmokeTarget(input, isGuest);
  if (note) console.log(note);
  const response = await fetch(targetUrl, { signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error(`Health returned HTTP ${response.status}`);
  const health = await response.json();
  if (health.ok !== true || typeof health.revision !== 'string') throw new Error('Unexpected health response');
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  const expected = git.status === 0 ? git.stdout.trim() : null;
  if (expected && health.revision !== expected) {
    throw new Error(`Revision differs: expected ${expected} (from local HEAD), received ${health.revision}. (Ensure your local repository is on main and up to date with origin/main.)`);
  }
  console.log(`OK  ${displayOrigin} serves revision ${health.revision}`);
  if (!expected) console.log('CHECK  No local Git revision; served revision was not compared.');
  console.log('NEXT  Open the URL on another device and complete the core task.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSmoke().catch(error => { console.error(`FAIL  ${error.message}`); process.exitCode = 1; });
}
