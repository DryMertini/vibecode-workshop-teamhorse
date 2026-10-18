import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceUnit } from '../scripts/deploy.mjs';

const config = { release: '/home/student/releases/one', home: '/home/student', revision: 'a'.repeat(40), nodeDirectory: '/usr/local/bin' };

test('service uses a release snapshot, unprivileged app user, expected port and revision', () => {
  const unit = serviceUnit(config);
  assert.match(unit, /User=student\n/);
  assert.match(unit, /WorkingDirectory=\/home\/student\/releases\/one\n/);
  assert.match(unit, /Environment=PORT=3000\n/);
  assert.ok(unit.includes(`Environment=APP_REVISION=${config.revision}\n`));
  assert.match(unit, /ExecStart=\/usr\/bin\/env npm start\n/);
});

test('unsafe service interpolation is rejected before any unit can be installed', () => {
  for (const path of ['/home/student\nUser=root', '/home/%i', '/home/$(command)', 'relative/path']) {
    assert.throws(() => serviceUnit({ ...config, release: path }), /Deployment paths/);
  }
  assert.throws(() => serviceUnit({ ...config, revision: 'main\nUser=root' }), /Git revision/);
});
