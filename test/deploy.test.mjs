import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertReleaseIsolated, checkoutRefusal, guestRefusal, locationRefusal, previewDropIn, recoveryPlan, serviceDropIn,
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
