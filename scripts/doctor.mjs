import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
let failed = false;
function report(ok, message) { console.log(`${ok ? 'OK' : 'CHECK'}  ${message}`); if (!ok) failed = true; }
report(Number(process.versions.node.split('.')[0]) >= 22, `Node ${process.versions.node}; needs 22+`);
for (const command of ['git', 'npm']) {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8' });
  report(result.status === 0, `${command}: ${result.stdout?.trim() || 'not available'}`);
}
const remotes = spawnSync('git', ['remote', '-v'], { encoding: 'utf8' });
console.log(remotes.stdout?.trim() || 'No remotes yet. Add your team fork as origin.');
report(/origin\s+\S+/.test(remotes.stdout || ''), 'origin points to your team fork (verify the owner above)');
for (const name of ['AGENTS.md', 'IDEA.md', 'PLAN.md']) {
  try { report(Boolean(readFileSync(name, 'utf8').trim()), `${name} exists`); }
  catch { report(false, `${name} missing`); }
}
console.log('INFO  Doctor does not authenticate GitHub, verify team membership, SSH, DNS or hosted health.');
console.log('INFO  Agent sign-in is separate; follow docs/agents.md.');
process.exitCode = failed ? 1 : 0;
