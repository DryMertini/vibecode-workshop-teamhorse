# M1.2 / M1.3 — Board and "I'm in" (one branch, one PR, one review)

**Deliberate deviation (recorded in PLAN.md):** M1.2 and M1.3 ship as one branch (`m1.2-m1.3-board`), one PR and one review. A single person cannot afford four review cycles. Both ID sets are named below and both must be checked by S4.

## Outcome

After this step, on the running page:

- A runner fills route (required), meet-at point (required), distance in km (optional), pace free text (e.g. `5:30 /km`, never parsed, required), meeting time (required) — submits, and the run appears with those details.
- The same form refuses blank route, missing pace, or missing meeting time with an actionable message; no run is created.
- After reload, the run is still visible, meeting time shown exactly as entered (local wall-clock string, no timezone conversion — a deliberate decision; state it so a later step does not "fix" it).
- A second different client sees the same run; it survives a server restart from durable storage outside the release directories (`~/.local/share/vibecode-workshop/data/` per `.ai/rules.md`); the storage location is overridable for tests.
- A failed/interrupted write leaves the previous board readable (atomic write).
- The board orders upcoming runs by meeting time first; runs whose time has passed are separated out. It stays readable with a dozen runs. With none, a deliberate empty state invites the first post and states the club identity and when it runs.
- A runner taps **I'm in**, optionally types a display name, and the board immediately shows the name and count. Same device tapping again does not increase count and shows the device is already in. A second device tapping the same run increases independently. A join without a name is counted and the number's meaning is shown. Count and names survive reload and restart. Name is a display string, not an account: no login, no password, no email.
- `team-*.key` and `team-*.known_hosts` are added to `.gitignore` so handout credential files can never be committed (a handout key was found in the repository root during the M1.4 hosting rehearsal and had to be moved out before deploy).

No new framework, no build step, no runtime dependency, no CDN, no web font, no outbound HTTP from the app. Only `public/` serves web assets; durable data is never downloadable.

## Audit

**Base SHA:** `c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645` (`main` == `origin/main`).
**Current working branch:** `m1.1-trustworthy-baseline` (`1ac17ea`) — M1.1 is reviewed but unmerged by the human. **The M1.2 branch must be from `main` at `c3e2c39`, not from the M1.1 branch.** If the M1.1 PR merges before this branch opens, branch from the updated `main`; no conflict is expected because M1.2 touches `server.mjs`, `public/`, `test/app.test.mjs` (not `test/deploy.test.mjs`).

Commands actually run (2026-10-20, macOS, same repo):

```
git rev-parse main        → c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645
git rev-parse HEAD         → 1ac17ea525e143addf5c7b8662895b1ada5363ca (M1.1 branch)
npm test                   → 21 pass / 0 fail / 0 skipped (exit 0)
npm run doctor             → exit 0, all OK lines
npm run deploy:preview     → exit 0, prints proposed drop-in, changes nothing
which flock                → not found (macOS; does not affect this step)
git ls-files .gitignore    → .gitignore exists; no team-*.key / team-*.known_hosts patterns in it
cat .gitignore             → node_modules/, .env, .env.*, .workshop.local.md, *.log, coverage/, .DS_Store, .ai/private/, .ai/browser/
ls team-*.key team-*.known_hosts → no matches (none in repo root, but the M1.4 rehearsal confirms the pattern must be ignored)
mkdir -p ~/.local/share/vibecode-workshop/data/  → not present on this laptop; app must create recursively on first write
npm start                  → works locally: PORT=3001 APP_REVISION=c3e2c39 npm start → "Workshop app listening on 0.0.0.0:3001"; /api/health → 200; / → 200; /AGENTS.md → 404
```

**Port note:** the assigned guest already serves the app on **3000** behind the workshop proxy, so a `npm start` *on the guest* hits `EADDRINUSE`. Any local check on the guest must use `PORT=3001`. On this laptop 3000 is free.

Files in the base (`main` at `c3e2c39`):

- `server.mjs` — serves `/`, `/style.css`, `/api/health` only; `createApp({ revision })`; binds `0.0.0.0` on `PORT` (default 3000).
- `public/index.html` — starter landing page; `public/style.css` — dark system theme.
- `test/app.test.mjs` — imports `../server.mjs`; 3 tests (page/CSS/health, file traversal blocked, HEAD/reject POST). Must remain importing `../server.mjs`.
- `test/deploy.test.mjs` — imports `scripts/`; must stay untouched.
- `scripts/deploy.mjs`, `scripts/smoke.mjs`, `scripts/doctor.mjs`, `package.json` (scripts `start`, `test`, `deploy`, `smoke`, `doctor`), `package-lock.json` — intact.
- Data storage location: `~/.local/share/vibecode-workshop/data/` per `.ai/rules.md`; overridable via env for tests. **The environment variable that overrides the data directory is `WORKSHOP_DATA_DIR`** (it points at a *directory*; the app creates it recursively on first write, and creates the data file inside it). When it is unset, the default location above is used.

Assumptions verified:
- `public/` is the only web asset directory; no repository file is served (confirmed by `test/app.test.mjs` traversal case — all 404).
- `/api/health` returns JSON with `revision` matching `process.env.APP_REVISION`; must stay unchanged.
- Memory scope: guest runs inside 2G (`MemoryMax=2G`, `MemorySwapMax=0`); no new package keeps `npm ci` light.
- The meeting time is a local wall-clock string; it must not be converted to UTC or any other timezone.

**The contract the coder must meet on endpoints and fields** (names are fixed so the reviewer can test them; the body shape beyond the named fields is the coder's, and any deviation must be stated in `validation.md`):

- `GET /api/board` → the board: the list of runs with route, meet-at, distance, pace, meeting time, the join count and the join names, and enough information for the page to say whether *this* device has already joined.
- `POST /api/runs` → create a run. Accepted fields: `route`, `meetAt`, `distance` (optional), `pace`, `meetingTime`. Missing `route`, `pace` or `meetingTime` → refused with a message the runner can act on, and **no run created**.
- `POST /api/join` → join a run: the run id, an optional `name` (display string), and the device identity. Joining again from the same device does not increase the count.

**Device identity:** one join per device. The device token may live in browser storage — that is fine, because the **board data is server state**; the browser only remembers *which device this is*, never the board. The reviewer checks the *behaviour* (same device, second device, nameless join), not the token mechanism.

## Acceptance

### Normal cases

- [ ] **N1 — post a run.** Fill route (required), meet-at (required), distance (optional), pace (required, free text, not parsed), meeting time (required) → submit → run appears with all entered details, meeting time shown exactly as entered.
- [ ] **N2 — second visitor sees it.** From a different browser/client, the same board shows the same run with same meeting time.
- [ ] **N3 — survives reload.** Refresh in the same browser; the run is still present, same details.
- [ ] **N4 — survives server restart.** Stop `npm start`, restart; the board reads from durable file (`~/.local/share/vibecode-workshop/data/`) and the run remains.
- [ ] **N5 — durable file is overridable.** Change data path via environment; tests use a temporary directory; production uses `~/.local/share/vibecode-workshop/data/`.
- [ ] **N6 — ordering.** Upcoming runs sorted by meeting time ascending; runs with time in the past separated (not mixed in with upcoming).
- [ ] **N7 — readable with a dozen runs.** Add ~12 runs; no overflow, no truncation, no horizontal scroll.
- [ ] **N8 — empty state invites.** No runs: board shows a deliberate message inviting the first post and one line stating the club and when it runs.
- [ ] **N9 — form works on phone.** One page, no navigation, large touch targets; no horizontal overflow at 375×812 and 1440×1000; no browser console errors.
- [ ] **N10 — "I'm in" with name.** Tap → optional name typed → board shows name and count immediately.
- [ ] **N11 — same device does not double-count.** Tap again on same device → count unchanged, board indicates already joined.
- [ ] **N12 — second device increases independently.** Different device taps same run → count increases, new name shown.
- [ ] **N13 — join without name is counted.** No name typed → count increases; board explains what the number means.
- [ ] **N14 — count and names survive reload and restart.** After reload and after server restart, same counts and names present.
- [ ] **N15 — name is display string.** No login, no password, no email, no account identity; one join per device.

### Empty / failure cases

- [ ] **F1 — blank route refused.** Submit with blank route → message the runner can act on; no run created.
- [ ] **F2 — missing pace refused.** Submit with blank pace (free text required) → refused with message; no run created.
- [ ] **F3 — missing meeting time refused.** Submit without meeting time → refused with message; no run created.
- [ ] **F4 — interrupted write safe.** During a write, kill the server; previous board remains readable (atomic write via temp file + rename).
- [ ] **F5 — data file not downloadable.** `GET /data`, `GET /~/.local/share/...`, encoded traversal, or any path outside `public/` → 404. The stored data file never appears in the response.

### Boundary / access / data cases

- [ ] **B1 — deploy contract intact.** `scripts/deploy.mjs`, `scripts/smoke.mjs`, `scripts/doctor.mjs` stay; `package.json` keeps `start`, `test`, `deploy`, `smoke`, `doctor`; `package-lock.json` committed; `start` listens on `PORT` (default 3000) on `0.0.0.0`; `npm test` passes; `/api/health` returns `{"ok": true, "revision": "..."}` matching `process.env.APP_REVISION`; `test/app.test.mjs` still imports `../server.mjs`; `test/deploy.test.mjs` still imports `scripts/`.
- [ ] **B2 — no repository file served.** `/AGENTS.md`, `/package.json`, `/public/../server.mjs`, `/%2e%2e/.env` → 404.
- [ ] **B3 — storage overridable but secure.** Changing the data path env variable changes the file; no other path escapes; the file is not under `public/`.
- [ ] **B4 — `.gitignore` updated.** `team-*.key` and `team-*.known_hosts` are ignored; explanation in brief (handout credential moved out during M1.4 rehearsal).
- [ ] **B5 — meeting time is local wall-clock.** The runner enters a local date and time (the format is the coder's, as long as it is an unambiguous local wall-clock value). It is **stored exactly as entered**, and the wall-clock shown to the reader must be the same wall-clock the runner entered. It may be *presented* differently — for example `Thu 22 Oct · 07:00` derived from the string's own fields — but only by reformatting those fields directly. What is forbidden is any timezone conversion or shift: no `new Date(...)` built from it, no `toISOString()`, no `getTimezoneOffset()`, no `toLocaleString()` applied to a Date built from it, and no re-parsing in a zone that changes the value. Separating past from upcoming and sorting by meeting time may compare that value against the server's **local** clock — but the comparison must never change what is stored or what wall-clock is shown. This is deliberate; state it clearly so a future step does not introduce a conversion.

### Browser cases (S4 reviewer must open the running page)

- [ ] **U1 — phone width (375×812).** One page, no navigation, large targets. No horizontal scroll. No console errors. Form submits. Board shows run. "I'm in" works.
- [ ] **U2 — desktop width (1440×1000).** Board readable with a dozen runs. No overflow. Same functionality.
- [ ] **U3 — second device simulation.** Open in incognito/different browser profile, or open two browser windows; confirm independent counts.
- [ ] **U4 — reload and restart observed.** After reload, data present; after `kill` and `npm start`, data present.

## Boundaries and dependencies

**Must remain true:**
- The deployment contract in `AGENTS.md` and `docs/deploy.md`: `scripts/` intact; `package.json` scripts preserved; `package-lock.json` committed; `/api/health` unchanged; `test/app.test.mjs` extended (not deleted); `test/deploy.test.mjs` untouched; only `public/` serves assets; durable data outside release directories.
- Zero new runtime dependencies; no build step; no framework swap; no CDN; no web font; no outbound HTTP from the app.
- `server.mjs` is extended (not replaced), so `test/app.test.mjs` can still import it.
- Only files under `public/` are web assets; the data file must never be downloadable.
- The app runs on `PORT` (default 3000) bound to `0.0.0.0` or `127.0.0.1`; started with `npm start`.
- Memory scope: 2G bounded; no bloat from new packages.

**What is out of scope:**
- No real authentication or accounts. A name is a display string only.
- No recurring runs, no maps, no pace/distance filters, no calendar export, no comments.
- No deployment to the live guest (M1.4) — this step builds the product locally. The public URL still shows the starter page until M1.4.
- No timezone conversion — the meeting time stays a naive local string.

**Dependencies:**
- Depends on M1.1 (plan committed, deploy contract verified). M1.1 may merge before this branch opens; in that case branch from the updated `main` (no expected conflict).
- `~/.local/share/vibecode-workshop/data/` must exist (or be created) before first write; tests must be able to override it.

**Files the coder is expected to change (must state in `validation.md` if different):**
- `server.mjs` — extend endpoints (`GET /api/board`, `POST /api/runs`, `POST /api/join`) and durable file read/write; keep `createApp` export and health endpoint.
- `public/index.html` — replace starter landing with the running-club board and form.
- `public/style.css` — extend for phone layout, board readability with a dozen items, large targets; no new external assets.
- `public/app.js` — only if the board needs a client script. It must live under `public/` and the server's asset map must serve it with a JavaScript content type; the page must make no request that 404s and must log no console error. Inline the script in `public/index.html` instead if that is simpler — state which was done in `validation.md`.
- `test/app.test.mjs` — extend with tests for board, form validation, durable read/write, join, traversal (existing cases stay).
- `.gitignore` — add `team-*.key` and `team-*.known_hosts`.
- `.ai/work/M1.2/{brief,validation,review}.md` — evidence.

**Branch:** `m1.2-m1.3-board` from `main` at `c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645`.

**Evidence paths:** `.ai/work/M1.2/brief.md` (this file), `.ai/work/M1.2/validation.md` (S3 coder), `.ai/work/M1.2/review.md` (S4 reviewer, different model family, receives only this brief, the committed diff and `validation.md`).

**Session sequence:**
1. **S3 — coder** (family A, e.g. `cohere/north-mini-code`). Implements one branch. Writes `validation.md` with actual commands run, literal output, base/head SHAs, and any check not run stated plainly. Does not merge, does not deploy.
2. **S4 — reviewer** (**different model family**, e.g. `minimax/minimax-m3.1-flash`). Receives only brief, diff (`git diff c3e2c39...HEAD`), `validation.md`. Re-runs `npm test`, opens the page at 375×812 and 1440×1000, verifies both M1.2 and M1.3 cases, writes `.ai/work/M1.2/review.md` with APPROVE or REQUEST CHANGES (must explain what was checked), records provider/model for both sessions.
3. **S5 — committer**. Confirms head SHA equals approved SHA, opens PR inside team fork (`DryMertini/vibecode-workshop-teamhorse`), merges exactly that SHA, updates `PLAN.md` (M1.2/M1.3 row → merged), `.ai/context.md`, `.ai/sessions/`. No deployment without human instruction; M1.4 is separate.

## Small and deliberate: `.gitignore`

Add:

```
team-*.key
team-*.known_hosts
```

**Why:** The M1.4 hosting rehearsal found `team-06.key` inside the repository working tree; it had to be moved out (`chmod 600`, outside repo) before deployment. Without this ignore, `git add -A` would sweep any future handout file back into the repo. This is a one-line guard with a clear reason tied to observed behaviour during hosting setup.

## Audit notes for reviewer

- The base SHA (`c3e2c39`) is the same as M1.1's base; the M1.2 branch is independent.
- `npm test` is green (21/21) at audit time.
- The data file location (`~/.local/share/vibecode-workshop/data/`) is confirmed by `.ai/rules.md`; the directory is absent on this laptop, so the app must create it (recursively) before writing. It must be overridable via an environment variable so tests can use a temporary directory.
- The meeting time must be a naive string; any `new Date` conversion, `toISOString`, `getTimezoneOffset`, or `toLocaleString` applied to it is a violation of B5 and must be rejected.
- The `.gitignore` change is the only non-product change in this brief; it must appear in the diff.
- If the M1.1 PR merges before this branch opens, the branch should be rebased/opened from updated `main`; no file-level conflict is expected.

This brief was written by the milestone lead session. It contains no implementation; only `.ai/work/M1.2/brief.md` was created.
