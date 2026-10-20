import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.mjs';

function tempDataDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'run-board-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, 'data');
}

async function fixture(t, { dataDir = tempDataDir(t), now } = {}) {
  const app = createApp({ revision: 'test-revision', dataDir, now });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const stop = () => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); });
  t.after(() => app.listening && stop());
  return Object.assign(`http://127.0.0.1:${app.address().port}`, { dataDir, stop });
}

test('page, CSS and health are reachable and health identifies the served revision', async t => {
  const origin = await fixture(t);
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /<h1>/);
  const css = await fetch(`${origin}/style.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  const health = await fetch(`${origin}/api/health`);
  assert.deepEqual(await health.json(), { ok: true, revision: 'test-revision' });
});

test('repository files and traversal requests cannot be downloaded', async t => {
  const origin = await fixture(t);
  for (const path of ['/.env', '/AGENTS.md', '/package.json', '/.git/config', '/%2e%2e/.env', '/public/../server.mjs']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, path);
  }
});

test('HEAD has no body and unsupported writes are rejected', async t => {
  const origin = await fixture(t);
  const head = await fetch(origin, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const post = await fetch(origin, { method: 'POST', body: 'data' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
});

const DEVICE_A = 'device-aaaaaaaa';
const DEVICE_B = 'device-bbbbbbbb';
const riverside = { route: 'Riverside loop', meetAt: 'North end of the bridge', distance: '8', pace: '5:30 /km', meetingTime: '2030-10-22T07:00' };

function post(origin, path, body, device = DEVICE_A) {
  return fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-device-id': device }, body: JSON.stringify(body) });
}
async function board(origin, device = DEVICE_A, query = '') {
  const response = await fetch(`${origin}/api/board${query}`, { headers: { 'x-device-id': device } });
  assert.equal(response.status, 200);
  return response.json();
}

test('an empty board is a valid board', async t => {
  const origin = await fixture(t);
  assert.deepEqual(await board(origin), { upcoming: [], past: [] });
  const page = await (await fetch(origin)).text();
  assert.match(page, /No runs posted yet/);
  const script = await fetch(`${origin}/app.js`);
  assert.equal(script.status, 200);
  assert.match(script.headers.get('content-type'), /text\/javascript/);
});

test('a posted run is visible to a second client with the meeting time exactly as entered', async t => {
  const origin = await fixture(t);
  const created = await post(origin, '/api/runs', riverside);
  assert.equal(created.status, 201);
  const [run] = (await board(origin, DEVICE_B)).upcoming;
  assert.equal(run.route, 'Riverside loop');
  assert.equal(run.meetAt, 'North end of the bridge');
  assert.equal(run.distance, '8');
  assert.equal(run.pace, '5:30 /km');
  assert.equal(run.meetingTime, '2030-10-22T07:00');
  assert.equal(run.count, 0);
  assert.equal(run.joined, false);
  assert.equal('joins' in run, false, 'device tokens are never sent to clients');
});

test('missing route, meet-at, pace or meeting time is refused with a message and creates nothing', async t => {
  const origin = await fixture(t);
  for (const [field, message] of [['route', /route/i], ['meetAt', /where to meet/i], ['pace', /pace/i], ['meetingTime', /date and time/i]]) {
    const response = await post(origin, '/api/runs', { ...riverside, [field]: '   ' });
    assert.equal(response.status, 400, field);
    assert.match((await response.json()).error, message, field);
  }
  for (const bad of [{ meetingTime: '22/10 7am' }, { meetingTime: '2030-02-30T07:00' }, { distance: 'far' }, { distance: '-3' }]) {
    assert.equal((await post(origin, '/api/runs', { ...riverside, ...bad })).status, 400, JSON.stringify(bad));
  }
  const notJson = await fetch(`${origin}/api/runs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
  assert.equal(notJson.status, 400);
  assert.deepEqual(await board(origin), { upcoming: [], past: [] });
});

test('distance is optional and pace is free text that is never parsed', async t => {
  const origin = await fixture(t);
  assert.equal((await post(origin, '/api/runs', { ...riverside, distance: '', pace: 'easy, chatty' })).status, 201);
  const [run] = (await board(origin)).upcoming;
  assert.equal(run.distance, '');
  assert.equal(run.pace, 'easy, chatty');
});

test('upcoming runs are ordered by meeting time and started runs are separated', async t => {
  const origin = await fixture(t, { now: () => '2030-10-20T12:00' });
  for (const meetingTime of ['2030-10-25T07:00', '2030-10-19T07:00', '2030-10-21T06:30', '2030-10-20T11:59', '2030-10-21T06:00']) {
    assert.equal((await post(origin, '/api/runs', { ...riverside, meetingTime })).status, 201);
  }
  const result = await board(origin);
  assert.deepEqual(result.upcoming.map(run => run.meetingTime), ['2030-10-21T06:00', '2030-10-21T06:30', '2030-10-25T07:00']);
  assert.deepEqual(result.past.map(run => run.meetingTime), ['2030-10-20T11:59', '2030-10-19T07:00']);
  // The page may supply its own local clock; stored times are unchanged either way.
  const later = await board(origin, DEVICE_A, '?now=2030-10-22T00:00');
  assert.deepEqual(later.upcoming.map(run => run.meetingTime), ['2030-10-25T07:00']);
});

test('I\'m in counts once per device, keeps names, and counts nameless joins', async t => {
  const origin = await fixture(t);
  const { run } = await (await post(origin, '/api/runs', riverside)).json();
  const first = await (await post(origin, '/api/join', { runId: run.id, device: DEVICE_A, name: '  Sam  ' }, DEVICE_A)).json();
  assert.equal(first.alreadyIn, false);
  assert.deepEqual([first.run.count, first.run.names, first.run.joined], [1, ['Sam'], true]);
  const again = await (await post(origin, '/api/join', { runId: run.id, device: DEVICE_A, name: 'Sam again' }, DEVICE_A)).json();
  assert.equal(again.alreadyIn, true);
  assert.equal(again.run.count, 1);
  const second = await (await post(origin, '/api/join', { runId: run.id, device: DEVICE_B, name: '' }, DEVICE_B)).json();
  assert.deepEqual([second.run.count, second.run.names, second.run.unnamed], [2, ['Sam'], 1]);
  const seenByA = (await board(origin, DEVICE_A)).upcoming[0];
  const seenByStranger = (await board(origin, 'device-cccccccc')).upcoming[0];
  assert.equal(seenByA.joined, true);
  assert.equal(seenByStranger.joined, false);
  assert.equal(seenByStranger.count, 2);
  assert.equal((await post(origin, '/api/join', { runId: 'nope', device: DEVICE_A })).status, 404);
  assert.equal((await post(origin, '/api/join', { runId: run.id }, 'bad')).status, 400);
});

test('runs and joins survive a server restart from the data directory', async t => {
  const dataDir = tempDataDir(t);
  const first = await fixture(t, { dataDir });
  const { run } = await (await post(first, '/api/runs', riverside)).json();
  await post(first, '/api/join', { runId: run.id, device: DEVICE_B, name: 'Sam' }, DEVICE_B);
  await first.stop();
  assert.deepEqual(readdirSync(dataDir), ['board.json'], 'no temporary files are left behind');
  const second = await fixture(t, { dataDir });
  const [restored] = (await board(second, DEVICE_B)).upcoming;
  assert.equal(restored.meetingTime, '2030-10-22T07:00');
  assert.deepEqual([restored.count, restored.names, restored.joined], [1, ['Sam'], true]);
});

test('an unreadable board file is reported, not overwritten', async t => {
  const dataDir = tempDataDir(t);
  const first = await fixture(t, { dataDir });
  await post(first, '/api/runs', riverside);
  await first.stop();
  const file = join(dataDir, 'board.json');
  writeFileSync(file, '{"runs": [ truncated');
  const second = await fixture(t, { dataDir });
  assert.equal((await fetch(`${second}/api/board`)).status, 500);
  assert.equal((await post(second, '/api/runs', riverside)).status, 500);
  assert.equal(readFileSync(file, 'utf8'), '{"runs": [ truncated');
});

test('the data file and API internals are not downloadable', async t => {
  const origin = await fixture(t);
  await post(origin, '/api/runs', riverside);
  for (const path of ['/board.json', '/data/board.json', '/api/board.json', '/%2e%2e/data/board.json', '/api/', '/app.js/../board.json']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, path);
  }
  assert.equal((await fetch(`${origin}/api/runs`)).status, 405);
  assert.equal((await fetch(`${origin}/api/board`, { method: 'POST' })).status, 405);
});
