import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

async function fixture(t) {
  const app = createApp({ revision: 'test-revision' });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  return `http://127.0.0.1:${app.address().port}`;
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
