import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BUILD_MEMORY_MAX, acquireDeployLock, assertReleaseIsolated, checkoutRefusal, guestRefusal, locationRefusal,
  memoryBoundedArgv, memoryControllerDelegated, previewDropIn, pruneReleaseDirectories, recoveryPlan, serviceDropIn,
} from '../scripts/deploy.mjs';

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

test('deploy lock rejects a second holder and releases when the holder dies', async () => {
  const path = join(tmpdir(), `vc-deploy-lock-${process.pid}-${Date.now()}`);
  rmSync(path, { force: true });
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
