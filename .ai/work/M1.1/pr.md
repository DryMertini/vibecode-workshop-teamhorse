## Outcome

**M1.1 — A trustworthy local baseline.** No product feature ships here. After this step the team can run `npm test` on a macOS laptop and get a green run that means something, the same suite is green on Linux, and the agreed goal and plan are committed on the team fork instead of living only in a working tree.

The change: the `deploy lock rejects a second holder and releases when the holder dies` case now runs on every platform. A new `flockBinaryExists()` helper looks for an executable `flock` in `PATH` **without consulting `scripts/deploy.mjs`**, so the branch cannot be satisfied by a `deploy.mjs` that refuses to lock everywhere. Where `flock` exists, the original assertions are unchanged and still run (second holder rejected with *"another deploy is running"*; the lock is released when the holder dies, including after `SIGKILL`). Where `flock` is absent, the case asserts the existing guard error positively — no skip, no no-op, no deleted case, no reduced test count. `scripts/deploy.mjs` was **not** changed: the production guard is already correct.

## Acceptance and evidence

- Brief: `.ai/work/M1.1/brief.md`
- Validation (coder): `.ai/work/M1.1/validation.md`
- Independent review (separate session, different model family from the coder): `.ai/work/M1.1/review.md`
- **Reviewed SHA: `9aa24c32f5dcb04fd40d5610186046498929dde5`** (base `c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645`). The review approves that SHA only.
- Reviewer: `openrouter` / `openrouter/free`. Coder: `openrouter` / `minimax/minimax-m3.1-flash`. Different families.

## Validation

Commands actually run by the coder and re-run independently by the reviewer:

- `npm test` → `tests 21 / pass 21 / fail 0 / skipped 0 / todo 0`, exit 0. The count is unchanged from the base SHA; the `deploy lock …` case still runs.
- `npm run doctor` → all OK, exit 0.
- `npm run deploy:preview` → prints the drop-in, ends with `PREVIEW ONLY`; `~/.config/systemd/user/` and `~/.local/share/vibecode-workshop/` unchanged (still absent).
- Health and access boundary on `PORT=3011`: `/api/health` → 200 `{"ok":true,"revision":"…"}` matching `APP_REVISION`; `/` and `/style.css` → 200; `/AGENTS.md`, `/package.json`, `/.env`, `/IDEA.md`, `/PLAN.md` and traversal forms → 404. Server stopped, nothing left listening.
- Test-design checks by the reviewer, in scratch directories outside the repo: a `deploy.mjs` whose guard throws the wrong message makes the suite fail and the case names itself; a `deploy.mjs` that refuses to lock everywhere also makes the suite fail; the `flock`-present assertions pass under a `fcntl` emulation of `flock -n` (second holder rejected, SIGKILL release, next acquire succeeds).
- `server.mjs`, `public/index.html`, `public/style.css`, `package.json`, `package-lock.json` and every file in `scripts/` are byte-identical to the base SHA. No dependency, no build step, no new script.
- Browser: not required, no UI change. No deployment, no push, no hosted check by the agent sessions.

## Limits

- **N5 (green on Linux) is unproven.** This fork has never run a GitHub Actions workflow — `actions/workflows` and `actions/runs` both return `total_count: 0` because Actions are disabled on new forks. A `Check` run on `ubuntu-latest` for this SHA is required to close it. An absent run is not a passing check.
- The `flock`-present assertions were exercised under a `fcntl` **emulation**, not util-linux `flock`. Only a real `ubuntu-latest` run or the organiser's Linux guest closes that.
- A second, stronger review by a human using Claude Code or Codex against this same SHA was expected and was **not** done at the time of this PR.
- No team hosting: no assigned URL, no SSH handout, no guest. Nothing was deployed. M1.4 (the live release) remains blocked on the organiser, and it is a human release decision.
- `gh` is not installed on this machine, so this PR was opened in the browser.
