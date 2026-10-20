import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { accessSync, constants, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BUILD_MEMORY_MAX, acquireDeployLock, assertReleaseIsolated, checkoutRefusal, formatObservation, guestRefusal,
  healthFailureMessage, isOomKilled, locationRefusal, memoryBoundedArgv, memoryControllerDelegated,
  previewDropIn, pruneReleaseDirectories, recoveryPlan, serviceDropIn, waitForRevision,
} from '../scripts/deploy.mjs';
import { resolveSmokeTarget } from '../scripts/smoke.mjs';

const home = '/home/vc-team';
const release = '/home/vc-team/.local/share/vibecode-workshop/releases/one';
const revision = 'a'.repeat(40);
const config = { release, home, revision, nodeDirectory: '/usr/local/bin' };
const placeholderUnit = '[Service]\nEnvironment=PORT=3000\nExecStart=%h/workshop/start\n';

function guest(overrides = {}) {
  return {
    platform: 'linux',
    username: 'vc-team',
    contractText: 'user-app-v1\n',
    unitText: placeholderUnit,
    lingerFile: true,
    userManagerOk: true,
    ...overrides,
  };
}

test('drop-in points the user service at a release without a system user or privilege directive', () => {
  const unit = serviceDropIn(config);
  assert.match(unit, /WorkingDirectory=\/home\/vc-team\/\.local\/share\/vibecode-workshop\/releases\/one\n/);
  assert.match(unit, /Environment=PORT=3000\n/);
  assert.ok(unit.includes(`Environment=APP_REVISION=${revision}\n`));
  assert.ok(unit.includes(`Environment=WORKSHOP_GIT_SHA=${revision}\n`));
  assert.match(unit, /EnvironmentFile=-\/home\/vc-team\/\.config\/vibecode-workshop\/app\.env\n/);
  assert.match(unit, /ExecStart=\nExecStart=\/usr\/bin\/env npm start\n/);
  assert.doesNotMatch(unit, /^User=/m);
  assert.doesNotMatch(unit, /\[Install\]/);
  assert.equal(unit.includes('/workshop'), false);
});

test('preview names an uninstalled release and does not require the guest', () => {
  const unit = previewDropIn({ home, revision, nodeDirectory: '/usr/bin' });
  assert.match(unit, /releases\/aaaaaaaaaaaa-PREVIEW\n/);
  assert.match(unit, /ExecStart=\nExecStart=\/usr\/bin\/env npm start\n/);
});

test('unsafe service interpolation is rejected before any unit can be installed', () => {
  for (const path of ['/home/vc-team\nUser=root', '/home/%i', '/home/$(command)', 'relative/path']) {
    assert.throws(() => serviceDropIn({ ...config, release: path }), /Deployment paths/);
  }
  assert.throws(() => serviceDropIn({ ...config, revision: 'main\nUser=root' }), /Git revision/);
});

test('guest guard accepts only the image contract and refuses each missing marker', () => {
  assert.equal(guestRefusal(guest()), null);
  assert.match(guestRefusal(guest({ platform: 'darwin' })), /Linux workshop guest/);
  assert.match(guestRefusal(guest({ username: 'student' })), /vc-team/);
  assert.match(guestRefusal(guest({ contractText: null })), /vc-guest-contract/);
  assert.match(guestRefusal(guest({ contractText: 'user-app-v1\nextra\n' })), /not user-app-v1/);
  assert.match(guestRefusal(guest({ contractText: 'user-app-v2\n' })), /not user-app-v1/);
  assert.match(guestRefusal(guest({ unitText: null })), /placeholder unit/);
  assert.match(guestRefusal(guest({ unitText: '[Service]\nExecStart=/bin/true\n' })), /placeholder unit/);
  assert.match(guestRefusal(guest({ lingerFile: false })), /lingering/);
  assert.match(guestRefusal(guest({ userManagerOk: false })), /user manager/);
});

test('deploy refuses a dirty tree, a non-main branch, and the placeholder checkout', () => {
  assert.equal(checkoutRefusal({ branch: 'main', dirty: '' }), null);
  assert.match(checkoutRefusal({ branch: 'topic', dirty: '' }), /main branch/);
  assert.match(checkoutRefusal({ branch: 'main', dirty: ' M server.mjs' }), /dirty/);
  assert.equal(locationRefusal('/home/vc-team/src/team', home), null);
  assert.match(locationRefusal('/home/vc-team/workshop', home), /~\/workshop/);
  assert.match(locationRefusal('/home/vc-team/workshop/nested', home), /~\/workshop/);
});

test('releases cannot occupy the placeholder or application data', () => {
  assert.doesNotThrow(() => assertReleaseIsolated(release, home));
  assert.throws(() => assertReleaseIsolated('/home/vc-team/workshop/app', home), /Refusing to deploy into/);
  assert.throws(() => assertReleaseIsolated('/home/vc-team/.local/share/vibecode-workshop/data/db', home), /Refusing to deploy into/);
});

test('recovery restores the previous drop-in or falls back to the placeholder unit', () => {
  assert.deepEqual(recoveryPlan({ previousDropIn: '[Service]\nExecStart=\n' }), {
    restore: 'previous-release',
    actions: ['write-drop-in', 'daemon-reload', 'restart'],
  });
  assert.deepEqual(recoveryPlan({ previousDropIn: null }), {
    restore: 'placeholder',
    actions: ['remove-drop-in', 'daemon-reload', 'restart'],
  });
  assert.equal(recoveryPlan({ previousDropIn: null }).actions.includes('remove-release'), false);
  assert.throws(() => recoveryPlan({ previousDropIn: 1 }), /previous drop-in/);
});

test('deploy helper does not call a privilege tool or install a system unit', () => {
  const source = readFileSync(new URL('../scripts/deploy.mjs', import.meta.url), 'utf8');
  assert.equal(source.includes('sudo'), false);
  assert.equal(source.includes('/etc/systemd/system/'), false);
  assert.equal(source.includes('team-hello'), false);
  assert.equal(source.includes('workshop-app'), false);
  assert.equal(source.includes('student'), false);
});

test('prune keeps the active release and the rollback release', () => {
  const root = '/home/vc-team/.local/share/vibecode-workshop/releases';
  const active = `${root}/active`;
  const previous = `${root}/previous`;
  const stale = `${root}/stale`;
  const removed = [];
  const plan = pruneReleaseDirectories({
    releasesRoot: root,
    directories: [stale, active, previous],
    currentDropIn: `[Service]\nWorkingDirectory=${active}\n`,
    previousDropIn: `[Service]\nWorkingDirectory=${previous}\n`,
    activeRelease: active,
    remove: dir => removed.push(dir),
  });
  assert.deepEqual(removed, [stale]);
  assert.ok(plan.keep.includes(active));
  assert.ok(plan.keep.includes(previous));
});

test('a first deploy keeps only the active release when rollback is the placeholder', () => {
  const root = '/home/vc-team/.local/share/vibecode-workshop/releases';
  const removed = [];
  pruneReleaseDirectories({
    releasesRoot: root,
    directories: [`${root}/active`, `${root}/old`],
    currentDropIn: `WorkingDirectory=${root}/active\n`,
    previousDropIn: null,
    activeRelease: `${root}/active`,
    remove: dir => removed.push(dir),
  });
  assert.deepEqual(removed, [`${root}/old`]);
});

test('an unreadable previous drop-in does not prune', () => {
  const root = '/home/vc-team/.local/share/vibecode-workshop/releases';
  const removed = [];
  const plan = pruneReleaseDirectories({
    releasesRoot: root,
    directories: [`${root}/a`, `${root}/b`],
    currentDropIn: `WorkingDirectory=${root}/a\n`,
    previousDropIn: 'not a unit',
    activeRelease: `${root}/a`,
    remove: dir => removed.push(dir),
  });
  assert.deepEqual(plan.remove, []);
  assert.deepEqual(removed, []);
});

test('prune refuses paths outside the releases directory and deletes nothing', () => {
  const root = '/home/vc-team/.local/share/vibecode-workshop/releases';
  const removed = [];
  const remove = dir => removed.push(dir);
  const outside = [
    '/home/vc-team/workshop',
    '/home/vc-team/workshop/app',
    '/home/vc-team/.local/share/vibecode-workshop/data',
    `${root}/../../workshop`,
    `${root}/../data/db`,
    '/home/vc-team/.local/share/vibecode-workshop/releases-other/x',
    root,
  ];
  for (const target of outside) {
    assert.throws(() => pruneReleaseDirectories({
      releasesRoot: root,
      directories: [target, `${root}/stale`],
      currentDropIn: `WorkingDirectory=${root}/active\n`,
      previousDropIn: null,
      activeRelease: `${root}/active`,
      remove,
    }), /outside the releases directory/);
  }
  assert.deepEqual(removed, []);
});

test('install and build stay under the 3GiB guest limit', () => {
  assert.equal(BUILD_MEMORY_MAX, '2G');
  const argv = memoryBoundedArgv('npm', ['ci']);
  assert.equal(argv[0], 'systemd-run');
  assert.ok(argv.includes('--user'));
  assert.ok(argv.includes('--scope'));
  assert.ok(argv.includes(`MemoryMax=${BUILD_MEMORY_MAX}`));
  assert.ok(argv.includes('MemorySwapMax=0'));
  const dash = argv.indexOf('--');
  assert.deepEqual(argv.slice(dash + 1), ['npm', 'ci']);
  assert.equal(argv.includes('sudo'), false);
  const build = memoryBoundedArgv('npm', ['run', 'build', '--if-present']);
  assert.deepEqual(build.slice(build.indexOf('--') + 1), ['npm', 'run', 'build', '--if-present']);
});

test('memory delegation recognises only the memory controller', () => {
  assert.equal(memoryControllerDelegated('cpu memory pids'), true);
  assert.equal(memoryControllerDelegated('memory'), true);
  assert.equal(memoryControllerDelegated('cpu pids'), false);
  assert.equal(memoryControllerDelegated('notmemory'), false);
  assert.equal(memoryControllerDelegated(''), false);
  assert.equal(memoryControllerDelegated(null), false);
});

// Is there an executable `flock` in PATH? Asked here without consulting
// scripts/deploy.mjs, so the branch below cannot be satisfied by a deploy.mjs
// that refuses to lock everywhere.
function flockBinaryExists() {
  return (process.env.PATH || '').split(':').some(directory => {
    if (!directory) return false;
    try {
      accessSync(join(directory, 'flock'), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

test('deploy lock rejects a second holder and releases when the holder dies', async () => {
  const path = join(tmpdir(), `vc-deploy-lock-${process.pid}-${Date.now()}`);
  rmSync(path, { force: true });
  if (!flockBinaryExists()) {
    // macOS ships no util-linux flock, so the deploy guard refuses to lock at
    // all and says why. Assert that guard error here; the lock behaviour is
    // asserted everywhere flock exists.
    assert.throws(
      () => acquireDeployLock(path),
      /Cannot lock deploy because flock is missing\. The running service was not changed\./,
    );
    rmSync(path, { force: true });
    return;
  }
  const first = acquireDeployLock(path);
  try {
    assert.throws(() => acquireDeployLock(path), /another deploy is running/i);
  } finally {
    first.release();
  }
  const second = acquireDeployLock(path);
  second.release();

  const held = join(tmpdir(), `vc-deploy-held-${process.pid}-${Date.now()}.lock`);
  rmSync(held, { force: true });
  const modulePath = fileURLToPath(new URL('../scripts/deploy.mjs', import.meta.url));
  const child = spawn(process.execPath, [
    '--input-type=module',
    '-e',
    `import { acquireDeployLock } from ${JSON.stringify(modulePath)};
     acquireDeployLock(process.argv[1]);
     console.log('held');
     setInterval(() => {}, 1000);`,
    held,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let childErr = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { childErr += chunk; });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`holder did not start: ${output} ${childErr}`)), 5000);
      child.stdout.on('data', () => {
        if (output.includes('held')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    assert.throws(() => acquireDeployLock(held), /another deploy is running/i);
    child.kill('SIGKILL');
    await new Promise(resolve => child.once('exit', resolve));
    const after = acquireDeployLock(held);
    after.release();
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    rmSync(path, { force: true });
    rmSync(held, { force: true });
  }
});

test('health wait failure format captures observations, expected revision, shape and vc-app logs', async () => {
  assert.equal(formatObservation(null), 'no response received');
  assert.equal(formatObservation({ error: 'connection refused' }), 'connection refused');
  assert.equal(formatObservation({ error: 'timeout' }), 'timeout');

  const html404 = formatObservation({
    status: 404,
    statusText: 'Not Found',
    bodyText: '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body>Cannot GET /api/health</body></html>',
  });
  assert.match(html404, /HTTP 404 Not Found/);
  assert.match(html404, /body excerpt: "<!DOCTYPE html>/);

  const spaHtml = formatObservation({
    status: 200,
    statusText: 'OK',
    bodyText: '<!DOCTYPE html><html lang="en"><head><title>Vite App</title></head><body><div id="root"></div></body></html>',
    json: null,
  });
  assert.match(spaHtml, /HTTP 200 OK/);
  assert.match(spaHtml, /body excerpt: "<!DOCTYPE html>/);

  const wrongRev = formatObservation({
    status: 200,
    statusText: 'OK',
    json: { ok: true, revision: 'old-commit-sha' },
  });
  assert.match(wrongRev, /HTTP 200 OK/);
  assert.match(wrongRev, /revision seen: "old-commit-sha"/);

  const prerenderedUndefined = formatObservation({
    status: 200,
    statusText: 'OK',
    json: { ok: true },
  });
  assert.match(prerenderedUndefined, /HTTP 200 OK/);
  assert.match(prerenderedUndefined, /body: \{"ok":true\}/);

  const msg = healthFailureMessage({
    lastObservation: { error: 'connection refused' },
    expectedRevision: 'b'.repeat(40),
  });
  assert.match(msg, /New app did not report the intended revision within the startup window\./);
  assert.match(msg, /Last observed on http:\/\/127\.0\.0\.1:3000\/api\/health: connection refused/);
  assert.match(msg, new RegExp(`Expected revision: ${'b'.repeat(40)}`));
  assert.match(msg, new RegExp(`Expected JSON shape: \\{"ok":true,"revision":"${'b'.repeat(40)}"\\}`));
  assert.match(msg, /Run: vc-app logs/);

  // Test waitForRevision with successful mock probe
  const successResult = await waitForRevision('c'.repeat(40), {
    attempts: 3,
    intervalMs: 10,
    probe: async () => ({ ok: true, status: 200, json: { ok: true, revision: 'c'.repeat(40) } }),
  });
  assert.equal(successResult.ok, true);
  assert.equal(successResult.lastObservation.json.revision, 'c'.repeat(40));

  // Test waitForRevision with failing mock probe
  const failResult = await waitForRevision('c'.repeat(40), {
    attempts: 2,
    intervalMs: 10,
    probe: async () => ({ ok: false, error: 'connection refused' }),
  });
  assert.equal(failResult.ok, false);
  assert.equal(failResult.lastObservation.error, 'connection refused');
});

test('memory scope OOM detection recognises scope Result oom-kill and signals', () => {
  // B-report §7 case: process killed by OOM, systemd terminates scope with SIGTERM
  assert.equal(isOomKilled({ status: null, signal: 'SIGTERM' }, 'oom-kill'), true);
  // Direct SIGKILL or exit 137
  assert.equal(isOomKilled({ status: null, signal: 'SIGKILL' }, 'success'), true);
  assert.equal(isOomKilled({ status: 137, signal: null }, 'success'), true);
  // Normal non-OOM failure
  assert.equal(isOomKilled({ status: 1, signal: null }, 'success'), false);
  assert.equal(isOomKilled({ status: 0, signal: null }, 'success'), false);

  // memoryBoundedArgv unit name option
  const withUnit = memoryBoundedArgv('npm', ['ci'], '2G', 'vc-test-unit');
  assert.ok(withUnit.includes('--unit=vc-test-unit'));
  assert.ok(withUnit.includes('MemoryMax=2G'));
  assert.ok(withUnit.includes('MemorySwapMax=0'));
});

test('smoke resolves local health on workshop guest and public health on laptop', () => {
  // Inside workshop guest
  const guestTarget = resolveSmokeTarget('https://team-06.intra.land', true);
  assert.equal(guestTarget.targetUrl.href, 'http://127.0.0.1:3000/api/health');
  assert.equal(guestTarget.displayOrigin, 'http://127.0.0.1:3000');
  assert.match(guestTarget.note, /Running on the workshop guest/);
  assert.match(guestTarget.note, /Cloudflare challenges/);

  // Inside guest with loopback URL already
  const loopbackTarget = resolveSmokeTarget('http://127.0.0.1:3000', true);
  assert.equal(loopbackTarget.targetUrl.href, 'http://127.0.0.1:3000/api/health');
  assert.equal(loopbackTarget.note, null);

  // On participant laptop (off-guest)
  const laptopTarget = resolveSmokeTarget('https://team-06.intra.land', false);
  assert.equal(laptopTarget.targetUrl.href, 'https://team-06.intra.land/api/health');
  assert.equal(laptopTarget.displayOrigin, 'https://team-06.intra.land');
  assert.equal(laptopTarget.note, null);
});
