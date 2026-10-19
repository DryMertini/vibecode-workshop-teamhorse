import { spawnSync } from 'node:child_process';
import { closeSync, constants, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The workshop image identifies itself to the participant account with:
// user vc-team, /etc/vc-guest-contract text "user-app-v1",
// /etc/systemd/user/vc-app.service (ExecStart=%h/workshop/start, PORT=3000),
// and /var/lib/systemd/linger/vc-team so the user manager outlives SSH.
// A drop-in redirects that unit at one release. ~/workshop is not rewritten.
export const GUEST_USER = 'vc-team';
export const GUEST_CONTRACT = 'user-app-v1';
export const CONTRACT_PATH = '/etc/vc-guest-contract';
export const UNIT_PATH = '/etc/systemd/user/vc-app.service';
export const LINGER_PATH = '/var/lib/systemd/linger/vc-team';
export const APP_SERVICE = 'vc-app.service';
export const DROP_IN_NAME = '50-workshop-release.conf';
// systemd treats G as base 1024, so 2G is 2 GiB. Guests have 3 GiB and no swap;
// the remaining 1 GiB is headroom for the serving app, sshd and the user manager.
export const BUILD_MEMORY_MAX = '2G';
const PATH_PATTERN = /^\/[A-Za-z0-9_./-]+$/;

export function dropInPath(home) {
  return join(home, '.config/systemd/user/vc-app.service.d', DROP_IN_NAME);
}

function assertDeploymentPath(path) {
  if (!PATH_PATTERN.test(path)) throw new Error('Deployment paths must be absolute and contain only letters, digits, /, _, . or -');
}

export function serviceDropIn({ release, home, revision, nodeDirectory }) {
  for (const path of [release, home, nodeDirectory]) assertDeploymentPath(path);
  if (!/^[a-f0-9]{40,64}$/.test(revision)) throw new Error('Expected a full Git revision');
  return `[Service]
WorkingDirectory=${release}
Environment=PATH=${nodeDirectory}:/usr/local/bin:/usr/bin:/bin
EnvironmentFile=-${home}/.config/vibecode-workshop/app.env
Environment=HOST=0.0.0.0
Environment=PORT=3000
Environment=APP_REVISION=${revision}
ExecStart=
ExecStart=/usr/bin/env npm start
TimeoutStopSec=15
`;
}

export function previewDropIn({ home, revision, nodeDirectory }) {
  const release = join(home, '.local/share/vibecode-workshop/releases', `${revision.slice(0, 12)}-PREVIEW`);
  return serviceDropIn({ release, home, revision, nodeDirectory });
}

export function isPlaceholderUnit(text) {
  return typeof text === 'string'
    && text.includes('ExecStart=%h/workshop/start\n')
    && text.includes('Environment=PORT=3000\n');
}

export function guestRefusal(probe) {
  if (probe.platform !== 'linux') return 'Deploy only inside your assigned Linux workshop guest. Use --dry-run elsewhere.';
  if (probe.username !== GUEST_USER) return 'Deploy only as vc-team on the assigned workshop guest. Use --dry-run elsewhere.';
  if (typeof probe.contractText !== 'string') return 'Cannot read /etc/vc-guest-contract. Deploy only on the assigned workshop guest.';
  if (!/^user-app-v1\n?$/.test(probe.contractText)) return 'Workshop guest contract is not user-app-v1. Deploy only on the assigned workshop guest.';
  if (!isPlaceholderUnit(probe.unitText)) return 'The guest user unit /etc/systemd/user/vc-app.service is missing or is not the workshop placeholder unit.';
  if (probe.lingerFile !== true) return 'User lingering is not enabled for vc-team (/var/lib/systemd/linger/vc-team). The app would stop when the SSH session ends.';
  if (probe.userManagerOk !== true) return 'The systemd user manager is not reachable. Open the assigned guest shell and retry.';
  return null;
}

export function checkoutRefusal({ branch, dirty }) {
  if (branch !== 'main') return 'Deploy only the reviewed main branch';
  if (dirty) return 'Checkout is dirty. Preserve/commit your work before deployment.';
  return null;
}

export function locationRefusal(root, home) {
  const checkout = resolve(root);
  const placeholder = resolve(home, 'workshop');
  if (checkout === placeholder || checkout.startsWith(`${placeholder}/`)) {
    return 'Refusing to deploy a checkout inside ~/workshop. Clone the team fork to ~/src/team. The guest placeholder stays untouched.';
  }
  return null;
}

export function assertReleaseIsolated(release, home) {
  const resolved = resolve(release);
  const forbidden = [resolve(home, 'workshop'), resolve(home, '.local/share/vibecode-workshop/data')];
  for (const place of forbidden) {
    if (resolved === place || resolved.startsWith(`${place}/`)) throw new Error(`Refusing to deploy into ${place}`);
  }
}

export function recoveryPlan({ previousDropIn }) {
  if (previousDropIn !== null && typeof previousDropIn !== 'string') throw new Error('previous drop-in must be a string or null');
  if (previousDropIn !== null) return { restore: 'previous-release', actions: ['write-drop-in', 'daemon-reload', 'restart'] };
  return { restore: 'placeholder', actions: ['remove-drop-in', 'daemon-reload', 'restart'] };
}

export function sessionEnv() {
  const uid = userInfo().uid;
  const runtime = process.env.XDG_RUNTIME_DIR || `/run/user/${uid}`;
  const env = { ...process.env, XDG_RUNTIME_DIR: runtime };
  if (!env.DBUS_SESSION_BUS_ADDRESS && existsSync(join(runtime, 'bus'))) {
    env.DBUS_SESSION_BUS_ADDRESS = `unix:path=${join(runtime, 'bus')}`;
  }
  return env;
}

function readOptional(path) {
  try { return readFileSync(path, 'utf8'); }
  catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EACCES' || error.code === 'EPERM') return null;
    throw error;
  }
}

export function readGuestProbe() {
  const manager = spawnSync('systemctl', ['--user', 'show', '-p', 'Version', '--value'], {
    encoding: 'utf8',
    env: sessionEnv(),
  });
  return {
    platform: process.platform,
    username: userInfo().username,
    contractText: readOptional(CONTRACT_PATH),
    unitText: readOptional(UNIT_PATH),
    lingerFile: existsSync(LINGER_PATH),
    userManagerOk: manager.status === 0 && Boolean(manager.stdout?.trim()),
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: 'inherit', ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed${result.error ? `: ${result.error.message}` : ` (exit ${result.status})`}`);
  return result.stdout?.trim();
}
function git(...args) { return run('git', args, { stdio: ['ignore', 'pipe', 'pipe'] }); }
function systemctlUser(...args) { return run('systemctl', ['--user', ...args], { env: sessionEnv() }); }

function writeOwnedFile(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, text, { mode: 0o644 });
    renameSync(tmp, path);
  } catch (error) {
    rmSync(tmp, { force: true });
    throw error;
  }
}

// flock(2) on an fd the process keeps open. The kernel drops it when the
// process exits, including SIGKILL, so a dead deploy cannot block the next one.
export function acquireDeployLock(lockPath) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const fd = openSync(lockPath, constants.O_RDWR | constants.O_CREAT | constants.O_CLOEXEC, 0o644);
  const result = spawnSync('flock', ['-n', '3'], {
    stdio: ['ignore', 'pipe', 'pipe', fd],
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0) {
    closeSync(fd);
    if (result.error?.code === 'ENOENT') {
      throw new Error('Cannot lock deploy because flock is missing. The running service was not changed.');
    }
    throw new Error('Another deploy is running. Wait for it to finish, then retry.');
  }
  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      closeSync(fd);
    },
  };
}

export function memoryControllerDelegated(text) {
  return typeof text === 'string' && text.trim().split(/\s+/).filter(Boolean).includes('memory');
}

function userManagerDelegatesMemory() {
  const shown = spawnSync('systemctl', ['--user', 'show', '-p', 'ControlGroup', '--value'], {
    encoding: 'utf8',
    env: sessionEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const controlGroup = shown.status === 0 ? shown.stdout.trim() : '';
  const paths = [];
  if (controlGroup.startsWith('/')) paths.push(`/sys/fs/cgroup${controlGroup}/cgroup.subtree_control`);
  const uid = userInfo().uid;
  paths.push(`/sys/fs/cgroup/user.slice/user-${uid}.slice/user@${uid}.service/cgroup.subtree_control`);
  return paths.some(path => memoryControllerDelegated(readOptional(path)));
}

export function memoryBoundedArgv(command, args, memoryMax = BUILD_MEMORY_MAX) {
  return [
    'systemd-run', '--user', '--scope', '--quiet',
    '-p', `MemoryMax=${memoryMax}`,
    '-p', 'MemorySwapMax=0',
    '--', command, ...args,
  ];
}

function assertMemoryScope() {
  if (!userManagerDelegatesMemory()) {
    throw new Error('Cannot memory-bound install/build: the memory controller is not delegated to this user. Refusing to run install or build beside the live app. The running service was not changed.');
  }
  const argv = memoryBoundedArgv('/bin/true', []);
  const result = spawnSync(argv[0], argv.slice(1), {
    encoding: 'utf8',
    env: sessionEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.error?.message || `exit ${result.status}`).trim();
    throw new Error(`Cannot start a memory-bounded user scope (${BUILD_MEMORY_MAX}, MemorySwapMax=0): ${detail}. Refusing to install or build beside the live app. The running service was not changed.`);
  }
}

function runMemoryBounded(command, args, options = {}) {
  const argv = memoryBoundedArgv(command, args);
  const result = spawnSync(argv[0], argv.slice(1), {
    encoding: 'utf8',
    env: sessionEnv(),
    ...options,
    stdio: 'inherit',
  });
  if (result.error) {
    throw new Error(`Could not start a memory-bounded ${command} (${result.error.message}). The running app was not changed.`);
  }
  if (result.status === 0) return;
  const signal = result.signal ? `, signal ${result.signal}` : '';
  const killed = result.signal === 'SIGKILL' || result.status === 137;
  if (killed) {
    throw new Error(`${command} ${args.join(' ')} was killed inside the ${BUILD_MEMORY_MAX} memory limit (exit ${result.status ?? 'none'}${signal}). The running app was not changed. Shrink the install or build, then retry.`);
  }
  throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status}${signal}). The running app was not changed.`);
}

export function workingDirectoryFromDropIn(text) {
  if (typeof text !== 'string') return null;
  const match = /^WorkingDirectory=(\/[A-Za-z0-9_./-]+)$/m.exec(text);
  return match ? match[1] : null;
}

export function assertInsideReleases(releasesRoot, target) {
  const root = resolve(releasesRoot);
  const path = resolve(target);
  if (path === root || !path.startsWith(`${root}/`)) {
    throw new Error(`Refusing to touch a path outside the releases directory: ${path}`);
  }
  return path;
}

export function selectReleasesToPrune({ releasesRoot, directories, currentDropIn, previousDropIn, activeRelease }) {
  const entries = directories.map(dir => assertInsideReleases(releasesRoot, dir));
  if (typeof previousDropIn === 'string' && !workingDirectoryFromDropIn(previousDropIn)) {
    return { keep: entries, remove: [] };
  }
  const keep = new Set();
  if (activeRelease) keep.add(resolve(activeRelease));
  for (const text of [currentDropIn, previousDropIn]) {
    const dir = workingDirectoryFromDropIn(text);
    if (dir) keep.add(resolve(dir));
  }
  return { keep: [...keep], remove: entries.filter(dir => !keep.has(dir)) };
}

export function pruneReleaseDirectories({ releasesRoot, directories, currentDropIn, previousDropIn, activeRelease, remove }) {
  const plan = selectReleasesToPrune({ releasesRoot, directories, currentDropIn, previousDropIn, activeRelease });
  for (const dir of plan.remove) {
    assertInsideReleases(releasesRoot, dir);
    remove(dir);
  }
  return plan;
}

function listReleaseDirectories(releasesRoot) {
  return readdirSync(releasesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(releasesRoot, entry.name));
}

function pruneHealthyReleases(releasesRoot, activeRelease, currentDropIn, previousDropIn) {
  try {
    const plan = pruneReleaseDirectories({
      releasesRoot,
      directories: listReleaseDirectories(releasesRoot),
      currentDropIn,
      previousDropIn,
      activeRelease,
      remove: dir => rmSync(dir, { recursive: true, force: true }),
    });
    if (plan.remove.length === 0) return 'No older releases to remove.';
    return `Removed ${plan.remove.length} older release(s). The active release and the rollback release were kept.`;
  } catch (error) {
    console.error(`Deployed, but old releases were kept: ${error.message}`);
    return 'Old releases were kept because pruning failed.';
  }
}

function removeFailedRelease(releasesRoot, release) {
  try {
    rmSync(assertInsideReleases(releasesRoot, release), { recursive: true, force: true });
  } catch (error) {
    console.error(`Could not remove the failed release: ${error.message}`);
  }
}

async function waitFor(attempts, check) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      if (await check()) return true;
    } catch { /* The service may still be starting. */ }
    await new Promise(done => setTimeout(done, 1000));
  }
  return false;
}

async function waitForRevision(revision) {
  return waitFor(15, async () => {
    const response = await fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(1000) });
    const body = await response.json();
    return response.ok && body.ok === true && body.revision === revision;
  });
}

async function restoredService(failedRevision, previousDropIn) {
  const expected = previousDropIn === null ? null : /Environment=APP_REVISION=([a-f0-9]{40,64})\n/.exec(previousDropIn)?.[1] || null;
  return waitFor(15, async () => {
    const response = await fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(1000) });
    if (!response.ok) return false;
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = null; }
    if (body?.ok === true && body.revision === failedRevision) return false;
    if (previousDropIn === null) return true;
    if (expected) return body?.ok === true && body.revision === expected;
    return true;
  });
}

async function restore(previousDropIn, home, failedRevision) {
  const plan = recoveryPlan({ previousDropIn });
  const errors = [];
  const path = dropInPath(home);
  const step = (label, fn) => { try { fn(); } catch (error) { errors.push(`${label}: ${error.message}`); } };
  for (const action of plan.actions) {
    if (action === 'write-drop-in') step(action, () => writeOwnedFile(path, previousDropIn));
    else if (action === 'remove-drop-in') step(action, () => rmSync(path, { force: true }));
    else if (action === 'daemon-reload') step(action, () => systemctlUser('daemon-reload'));
    else if (action === 'restart') step(action, () => systemctlUser('restart', APP_SERVICE));
    else step(action, () => { throw new Error('unknown recovery action'); });
  }
  try {
    if (!await restoredService(failedRevision, previousDropIn)) {
      errors.push('restored service is not serving the previous release or the placeholder');
    }
  } catch (error) {
    errors.push(`restore check: ${error.message}`);
  }
  return { plan, errors };
}

export async function main(args = process.argv.slice(2)) {
  if (args.some(arg => arg !== '--dry-run')) throw new Error('Only --dry-run is supported');
  const dryRun = args.includes('--dry-run');
  const home = homedir();
  const revision = git('rev-parse', 'HEAD');
  const root = git('rev-parse', '--show-toplevel');
  if (resolve(process.cwd()) !== root) throw new Error('Run deployment from the repository root');
  const nodeDirectory = dirname(process.execPath);
  if (dryRun) {
    console.log(`# ${dropInPath(home)}`);
    console.log(previewDropIn({ home, revision, nodeDirectory }));
    console.log('PREVIEW ONLY: no install, build, tests, services or deployment state changed.');
    return;
  }
  const guest = guestRefusal(readGuestProbe());
  if (guest) throw new Error(guest);
  const checkout = checkoutRefusal({ branch: git('branch', '--show-current'), dirty: git('status', '--porcelain') });
  if (checkout) throw new Error(checkout);
  const location = locationRefusal(root, home);
  if (location) throw new Error(location);
  const share = join(home, '.local/share/vibecode-workshop');
  mkdirSync(share, { recursive: true });
  const deployLock = acquireDeployLock(join(share, 'deploy.lock'));
  try {
    run('npm', ['test']);
    const releases = join(share, 'releases');
    assertReleaseIsolated(releases, home);
    mkdirSync(releases, { recursive: true });
    assertMemoryScope();
    let release = null;
    let switched = false;
    let previousDropIn = null;
    try {
      release = mkdtempSync(join(releases, `${revision.slice(0, 12)}-`));
      assertReleaseIsolated(release, home);
      const archive = join(release, 'source.tar');
      run('git', ['archive', '--format=tar', '--output', archive, revision]);
      run('tar', ['-xf', archive, '-C', release]);
      runMemoryBounded('npm', ['ci'], { cwd: release });
      runMemoryBounded('npm', ['run', 'build', '--if-present'], { cwd: release });
      writeFileSync(join(release, 'REVISION'), `${revision}\n`);
      const unit = serviceDropIn({ release, home, revision, nodeDirectory });
      const path = dropInPath(home);
      previousDropIn = existsSync(path) ? readFileSync(path, 'utf8') : null;
      writeOwnedFile(path, unit);
      switched = true;
      systemctlUser('daemon-reload');
      systemctlUser('restart', APP_SERVICE);
      if (!await waitForRevision(revision)) throw new Error('New app did not report the intended revision within the startup window');
      systemctlUser('enable', APP_SERVICE);
      const pruneNote = pruneHealthyReleases(releases, release, unit, previousDropIn);
      console.log(`DEPLOYED ${revision}\nRelease kept at ${release}\n${pruneNote}\nUser service ${APP_SERVICE} is active. ~/workshop was not modified.\nCheck your assigned HTTPS URL and browser journey next.\nStatus: vc-app status\nLogs: vc-app logs`);
    } catch (error) {
      if (switched) {
        console.error(`Deploy failed: ${error.message}. Attempting to restore the previous release or the guest placeholder.`);
        const recovery = await restore(previousDropIn, home, revision);
        if (recovery.errors.length) console.error(`RECOVERY NEEDS ORGANISER: ${recovery.errors.join('; ')}`);
        else {
          console.error(recovery.plan.restore === 'placeholder'
            ? 'Guest placeholder restored; verify http://127.0.0.1:3000/.'
            : 'Previous release restored; verify http://127.0.0.1:3000/api/health.');
          removeFailedRelease(releases, release);
        }
      } else if (release) {
        removeFailedRelease(releases, release);
      }
      throw error;
    }
  } finally {
    deployLock.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`FAIL ${error.message}`); process.exitCode = 1; });
}
