import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
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
  run('npm', ['test']);
  const share = join(home, '.local/share/vibecode-workshop');
  const releases = join(share, 'releases');
  assertReleaseIsolated(releases, home);
  mkdirSync(releases, { recursive: true });
  const release = mkdtempSync(join(releases, `${revision.slice(0, 12)}-`));
  assertReleaseIsolated(release, home);
  const archive = join(release, 'source.tar');
  run('git', ['archive', '--format=tar', '--output', archive, revision]);
  run('tar', ['-xf', archive, '-C', release]);
  run('npm', ['ci'], { cwd: release });
  run('npm', ['run', 'build', '--if-present'], { cwd: release });
  writeFileSync(join(release, 'REVISION'), `${revision}\n`);
  const unit = serviceDropIn({ release, home, revision, nodeDirectory });
  const path = dropInPath(home);
  const previousDropIn = existsSync(path) ? readFileSync(path, 'utf8') : null;
  let switched = false;
  try {
    writeOwnedFile(path, unit);
    switched = true;
    systemctlUser('daemon-reload');
    systemctlUser('restart', APP_SERVICE);
    if (!await waitForRevision(revision)) throw new Error('New app did not report the intended revision within the startup window');
    systemctlUser('enable', APP_SERVICE);
    console.log(`DEPLOYED ${revision}\nRelease retained at ${release}\nUser service ${APP_SERVICE} is active. ~/workshop was not modified.\nCheck your assigned HTTPS URL and browser journey next.\nStatus: vc-app status\nLogs: vc-app logs`);
  } catch (error) {
    if (!switched) throw error;
    console.error(`Deploy failed: ${error.message}. Attempting to restore the previous release or the guest placeholder.`);
    const recovery = await restore(previousDropIn, home, revision);
    if (recovery.errors.length) console.error(`RECOVERY NEEDS ORGANISER: ${recovery.errors.join('; ')}`);
    else console.error(recovery.plan.restore === 'placeholder'
      ? 'Guest placeholder restored; verify http://127.0.0.1:3000/.'
      : 'Previous release restored; verify http://127.0.0.1:3000/api/health.');
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`FAIL ${error.message}`); process.exitCode = 1; });
}
