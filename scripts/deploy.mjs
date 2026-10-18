import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function serviceUnit({ release, home, revision, nodeDirectory }) {
  for (const path of [release, home, nodeDirectory]) {
    if (!/^\/[A-Za-z0-9_./-]+$/.test(path)) throw new Error('Deployment paths must be absolute and contain only letters, digits, /, _, . or -');
  }
  if (!/^[a-f0-9]{40,64}$/.test(revision)) throw new Error('Expected a full Git revision');
  return `[Unit]
Description=Workshop team application
After=network-online.target

[Service]
User=student
WorkingDirectory=${release}
Environment=PATH=${nodeDirectory}:/usr/local/bin:/usr/bin:/bin
EnvironmentFile=-${home}/.config/vibecode-workshop/app.env
Environment=HOST=0.0.0.0
Environment=PORT=3000
Environment=APP_REVISION=${revision}
ExecStart=/usr/bin/env npm start
Restart=on-failure
RestartSec=2
TimeoutStopSec=15

[Install]
WantedBy=multi-user.target
`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: 'inherit', ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed${result.error ? `: ${result.error.message}` : ` (exit ${result.status})`}`);
  return result.stdout?.trim();
}
function git(...args) { return run('git', args, { stdio: ['ignore', 'pipe', 'pipe'] }); }
function systemctl(...args) { return run('sudo', ['-n', 'systemctl', ...args]); }
function state(kind, service) {
  return spawnSync('systemctl', [kind, '--quiet', service], { stdio: 'ignore' }).status === 0;
}
function installUnit(text) {
  run('sudo', ['-n', 'tee', '/etc/systemd/system/workshop-app.service'], { input: text, stdio: ['pipe', 'ignore', 'inherit'] });
  systemctl('daemon-reload');
}
export async function main(args = process.argv.slice(2)) {
  if (args.some(arg => arg !== '--dry-run')) throw new Error('Only --dry-run is supported');
  const dryRun = args.includes('--dry-run');
  const home = homedir();
  const revision = git('rev-parse', 'HEAD');
  const root = git('rev-parse', '--show-toplevel');
  if (resolve(process.cwd()) !== root) throw new Error('Run deployment from the repository root');
  const base = join(home, '.local/share/vibecode-workshop');
  const previewRelease = join(base, 'releases', `${revision.slice(0, 12)}-PREVIEW`);
  const preview = serviceUnit({ release: previewRelease, home, revision, nodeDirectory: dirname(process.execPath) });
  if (dryRun) {
    console.log(preview);
    console.log('PREVIEW ONLY: no install, build, tests, services or deployment state changed.');
    return;
  }
  if (process.platform !== 'linux' || userInfo().username !== 'student') throw new Error('Deploy only inside your assigned Linux container as student. Use --dry-run elsewhere.');
  if (git('branch', '--show-current') !== 'main') throw new Error('Deploy only the reviewed main branch');
  if (git('status', '--porcelain')) throw new Error('Checkout is dirty. Preserve/commit your work before deployment.');
  run('sudo', ['-n', 'true']);
  run('npm', ['test']);
  mkdirSync(join(base, 'releases'), { recursive: true });
  const release = mkdtempSync(join(base, 'releases', `${revision.slice(0, 12)}-`));
  const archive = join(release, 'source.tar');
  run('git', ['archive', '--format=tar', '--output', archive, revision]);
  run('tar', ['-xf', archive, '-C', release]);
  run('npm', ['ci'], { cwd: release });
  run('npm', ['run', 'build', '--if-present'], { cwd: release });
  writeFileSync(join(release, 'REVISION'), `${revision}\n`);
  const unit = serviceUnit({ release, home, revision, nodeDirectory: dirname(process.execPath) });
  const unitPath = '/etc/systemd/system/workshop-app.service';
  const previous = existsSync(unitPath) ? readFileSync(unitPath, 'utf8') : null;
  const wasHelloActive = state('is-active', 'team-hello.service');
  const wasHelloEnabled = state('is-enabled', 'team-hello.service');
  const wasAppActive = state('is-active', 'workshop-app.service');
  const wasAppEnabled = state('is-enabled', 'workshop-app.service');
  try {
    installUnit(unit);
    if (wasHelloActive) systemctl('stop', 'team-hello.service');
    systemctl('restart', 'workshop-app.service');
    let healthy = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        const response = await fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(1000) });
        const body = await response.json();
        if (response.ok && body.ok === true && body.revision === revision) { healthy = true; break; }
      } catch { /* The service may still be starting. */ }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!healthy) throw new Error('New app did not report the intended revision within the startup window');
    if (wasHelloEnabled) systemctl('disable', 'team-hello.service');
    systemctl('enable', 'workshop-app.service');
    console.log(`DEPLOYED ${revision}\nRelease retained at ${release}\nCheck your assigned HTTPS URL and browser journey next.`);
  } catch (error) {
    console.error(`Deploy failed: ${error.message}. Attempting process/configuration recovery.`);
    const recoveryErrors = [];
    const recover = fn => { try { fn(); } catch (e) { recoveryErrors.push(e.message); } };
    recover(() => systemctl('stop', 'workshop-app.service'));
    if (previous !== null) {
      recover(() => installUnit(previous));
      recover(() => systemctl(wasAppEnabled ? 'enable' : 'disable', 'workshop-app.service'));
      if (wasAppActive) recover(() => systemctl('start', 'workshop-app.service'));
    } else {
      recover(() => systemctl('disable', 'workshop-app.service'));
      recover(() => run('sudo', ['-n', 'rm', '-f', unitPath]));
      recover(() => systemctl('daemon-reload'));
    }
    if (wasHelloEnabled) recover(() => systemctl('enable', 'team-hello.service'));
    if (wasHelloActive) recover(() => systemctl('start', 'team-hello.service'));
    if (recoveryErrors.length) console.error(`RECOVERY NEEDS ORGANISER: ${recoveryErrors.join('; ')}`);
    else console.error('Previous service configuration restored; verify the prior app/hello health.');
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`FAIL ${error.message}`); process.exitCode = 1; });
}
