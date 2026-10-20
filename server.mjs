import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

const MAX_BODY_BYTES = 8 * 1024;
const MAX_RUNS = 500;
const MAX_JOINS = 200;
// Meeting times are naive local wall-clock strings (YYYY-MM-DDTHH:MM). They are stored and
// shown exactly as entered and never converted between timezones. This is deliberate.
const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DEVICE = /^[A-Za-z0-9_-]{8,64}$/;

export function defaultDataDir() {
  return process.env.WORKSHOP_DATA_DIR || join(homedir(), '.local', 'share', 'vibecode-workshop', 'data');
}

export function isWallClock(value) {
  const match = WALL_CLOCK.exec(value);
  if (!match) return false;
  const [, y, mo, d, h, mi] = match.map(Number);
  const daysInMonth = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth[mo - 1] && h <= 23 && mi <= 59;
}

// The server's local wall clock in the same format, used only to compare, never to rewrite a stored time.
function localNow() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function createStore(dataDir) {
  const file = join(dataDir, 'board.json');
  let board;
  let queue = Promise.resolve();

  async function load() {
    if (board) return board;
    let text;
    try { text = await readFile(file, 'utf8'); }
    catch (error) {
      if (error.code === 'ENOENT') return (board = { runs: [] });
      throw error;
    }
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.runs)) throw new Error(`Board file ${file} has no runs list`);
    return (board = parsed);
  }

  async function save(next) {
    await mkdir(dataDir, { recursive: true });
    const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
    try {
      const handle = await open(temp, 'w', 0o600);
      try {
        await handle.writeFile(JSON.stringify(next, null, 2) + '\n');
        await handle.sync();
      } finally { await handle.close(); }
      await rename(temp, file);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
    board = next;
  }

  return {
    read: load,
    // Mutations run one at a time; the in-memory board only changes after the file is renamed into place.
    update(change) {
      const result = queue.then(async () => {
        const current = structuredClone(await load());
        const outcome = change(current);
        if (outcome.save) await save(current);
        return outcome;
      });
      queue = result.catch(() => {});
      return result;
    },
  };
}

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function validateRun(input) {
  const run = {
    route: text(input.route, 120),
    meetAt: text(input.meetAt, 120),
    distance: text(String(input.distance ?? ''), 10),
    pace: text(input.pace, 40),
    meetingTime: text(input.meetingTime, 16),
  };
  if (!run.route) return { error: 'Add the route, for example "Riverside loop".' };
  if (!run.meetAt) return { error: 'Add where to meet, for example "North end of the bridge".' };
  if (!run.pace) return { error: 'Add the pace, for example "5:30 /km" or "easy, chatty".' };
  if (!run.meetingTime) return { error: 'Pick the meeting date and time.' };
  if (!isWallClock(run.meetingTime)) return { error: 'Pick the meeting date and time from the picker (date and time).' };
  if (run.distance) {
    const km = Number(run.distance);
    if (!Number.isFinite(km) || km <= 0 || km > 200) return { error: 'Distance is in km, between 0.1 and 200 — or leave it empty.' };
    run.distance = String(Math.round(km * 10) / 10);
  }
  return { run };
}

function view(run, device, now) {
  const named = run.joins.map(join => join.name).filter(Boolean);
  return {
    id: run.id,
    route: run.route,
    meetAt: run.meetAt,
    distance: run.distance,
    pace: run.pace,
    meetingTime: run.meetingTime,
    count: run.joins.length,
    names: named,
    unnamed: run.joins.length - named.length,
    joined: Boolean(device) && run.joins.some(join => join.device === device),
    past: run.meetingTime < now,
  };
}

function boardView(board, device, now) {
  const runs = board.runs.map(run => view(run, device, now))
    .sort((a, b) => a.meetingTime.localeCompare(b.meetingTime) || a.id.localeCompare(b.id));
  return { upcoming: runs.filter(run => !run.past), past: runs.filter(run => run.past).reverse() };
}

async function readJson(req) {
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) {
    throw Object.assign(new Error('Send the form as JSON.'), { status: 415 });
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('That request is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  throw Object.assign(new Error('That request was not valid JSON.'), { status: 400 });
}

function sendJson(res, status, body, head = false) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(head ? undefined : JSON.stringify(body));
}

export function createApp({ revision = process.env.APP_REVISION || 'development', dataDir = defaultDataDir(), now = localNow } = {}) {
  const store = createStore(dataDir);

  async function api(req, res, path, url) {
    const device = DEVICE.test(req.headers['x-device-id'] || '') ? req.headers['x-device-id'] : '';
    if (path === '/api/board') {
      if (!['GET', 'HEAD'].includes(req.method)) return methodNotAllowed(res, 'GET, HEAD');
      // The page sends its own local wall clock so "already started" matches the runner's clock.
      const clientNow = url.searchParams.get('now');
      const board = await store.read();
      return sendJson(res, 200, boardView(board, device, isWallClock(clientNow || '') ? clientNow : now()), req.method === 'HEAD');
    }
    if (path === '/api/runs') {
      if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
      const { run, error } = validateRun(await readJson(req));
      if (error) return sendJson(res, 400, { error });
      const outcome = await store.update(board => {
        if (board.runs.length >= MAX_RUNS) return { status: 409, body: { error: 'The board is full. Ask the organiser to clear old runs.' } };
        const created = { id: randomUUID(), ...run, createdAt: new Date().toISOString(), joins: [] };
        board.runs.push(created);
        return { save: true, status: 201, body: { run: view(created, device, now()) } };
      });
      return sendJson(res, outcome.status, outcome.body);
    }
    if (path === '/api/join') {
      if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
      const input = await readJson(req);
      const joiner = typeof input.device === 'string' && DEVICE.test(input.device) ? input.device : device;
      if (!joiner) return sendJson(res, 400, { error: 'This browser could not be identified. Reload the page and try again.' });
      const name = text(input.name, 40);
      const outcome = await store.update(board => {
        const run = board.runs.find(candidate => candidate.id === input.runId);
        if (!run) return { status: 404, body: { error: 'That run is no longer on the board. Reload to see the current runs.' } };
        if (run.joins.some(join => join.device === joiner)) return { status: 200, body: { alreadyIn: true, run: view(run, joiner, now()) } };
        if (run.joins.length >= MAX_JOINS) return { status: 409, body: { error: 'This run is full.' } };
        run.joins.push({ device: joiner, name, joinedAt: new Date().toISOString() });
        return { save: true, status: 200, body: { alreadyIn: false, run: view(run, joiner, now()) } };
      });
      return sendJson(res, outcome.status, outcome.body);
    }
    return sendJson(res, 404, { error: 'Not found' });
  }

  return http.createServer(async (req, res) => {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-store');
    let url;
    try { url = new URL(req.url, 'http://localhost'); }
    catch { res.writeHead(400); return res.end('Bad request'); }
    const path = url.pathname;
    if (path === '/api/health') {
      if (!['GET', 'HEAD'].includes(req.method)) return methodNotAllowed(res, 'GET, HEAD');
      return sendJson(res, 200, { ok: true, revision }, req.method === 'HEAD');
    }
    if (path.startsWith('/api/')) {
      try { return await api(req, res, path, url); }
      catch (error) {
        if (error.status) return sendJson(res, error.status, { error: error.message });
        console.error('Board unavailable:', error.message);
        return sendJson(res, 500, { error: 'The board is temporarily unavailable. Nothing was changed; try again shortly.' });
      }
    }
    if (!['GET', 'HEAD'].includes(req.method)) return methodNotAllowed(res, 'GET, HEAD');
    const asset = assets.get(path);
    if (!asset) { res.writeHead(404); return res.end('Not found'); }
    try {
      const body = await readFile(new URL(`./public/${asset[0]}`, import.meta.url));
      res.writeHead(200, { 'content-type': asset[1] });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      console.error('Asset unavailable:', error.message);
      res.writeHead(500);
      res.end('Page temporarily unavailable');
    }
  });
}

function methodNotAllowed(res, allow) {
  res.writeHead(405, { allow });
  res.end('Method not allowed');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1–65535');
  const app = createApp();
  app.on('error', error => { console.error(error.message); process.exitCode = 1; });
  app.listen(port, host, () => console.log(`Workshop app listening on ${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      app.close(() => process.exit(0));
      app.closeIdleConnections();
    });
  }
}
