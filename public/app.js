const $ = id => document.getElementById(id);
const memory = {};

function stored(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback(); } catch { return memory[key] ?? fallback(); }
}
function remember(key, value) {
  memory[key] = value;
  try { localStorage.setItem(key, value); } catch {}
}

// The browser only remembers which device this is; the board itself is server state.
const device = stored('run-board-device', () => {
  const id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g, '');
  remember('run-board-device', id);
  return id;
});

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Reformats the stored wall-clock fields directly. No Date is built from a meeting time,
// so nothing is ever shifted between timezones.
function formatMeeting(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  const weekday = (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
  return `${DAYS[weekday]} ${d} ${MONTHS[m - 1]} · ${match[4]}:${match[5]}`;
}

function localNow() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child != null) node.append(child);
  return node;
}

function going(run) {
  if (run.count === 0) return 'Nobody yet — be the first.';
  const people = [...run.names];
  if (run.unnamed) people.push(`${run.unnamed} without a name`);
  return `${run.count} going: ${people.join(', ')}`;
}

function card(run) {
  const facts = [run.distance ? `${run.distance} km` : null, run.pace].filter(Boolean).join(' · ');
  const button = el('button', { type: 'button', class: run.joined ? 'join joined' : 'join' }, run.joined ? "You're in ✓" : "I'm in");
  if (run.joined) button.disabled = true;
  else if (!run.past) button.addEventListener('click', () => join(run.id, button));
  if (run.past) button.hidden = !run.joined;
  return el('li', { class: 'run' },
    el('p', { class: 'when' }, el('time', { datetime: run.meetingTime }, formatMeeting(run.meetingTime))),
    el('h3', {}, run.route),
    el('p', { class: 'where' }, 'Meet at ', el('strong', {}, run.meetAt)),
    el('p', { class: 'facts' }, facts),
    el('div', { class: 'join-row' },
      el('p', { class: 'going', title: 'Each browser that tapped I\'m in counts once' }, going(run)),
      button));
}

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'x-device-id': device, ...(options.body ? { 'content-type': 'application/json' } : {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Try again.');
  return body;
}

async function load() {
  try {
    render(await request(`/api/board?now=${encodeURIComponent(localNow())}`));
    $('board-message').textContent = '';
  } catch (error) {
    $('board-message').textContent = error.message;
  }
}

function render(board) {
  $('upcoming').replaceChildren(...board.upcoming.map(card));
  $('past').replaceChildren(...board.past.map(card));
  $('past-count').textContent = board.past.length;
  $('past-section').hidden = board.past.length === 0;
  $('empty').hidden = board.upcoming.length > 0;
}

async function join(runId, button) {
  button.disabled = true;
  try {
    const result = await request('/api/join', { method: 'POST', body: JSON.stringify({ runId, device, name: $('my-name').value }) });
    $('board-message').textContent = result.alreadyIn ? 'This device is already in for that run.' : "You're in. The captain can see you on the board.";
    await load();
  } catch (error) {
    button.disabled = false;
    $('board-message').textContent = error.message;
  }
}

$('my-name').value = stored('run-board-name', () => '');
$('my-name').addEventListener('input', event => remember('run-board-name', event.target.value));

$('run-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  const submit = form.querySelector('button[type=submit]');
  submit.disabled = true;
  $('form-message').textContent = '';
  try {
    await request('/api/runs', { method: 'POST', body: JSON.stringify(data) });
    form.reset();
    $('board-message').textContent = 'Run posted. It is on the board for everyone now.';
    await load();
    $('upcoming').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    $('form-message').textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

load();
