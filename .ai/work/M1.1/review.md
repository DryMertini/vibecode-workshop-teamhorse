# M1.1 review

Base SHA: `c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645` (`main` == `origin/main` at audit time)
Head SHA: `9aa24c32f5dcb04fd40d5610186046498929dde5` (`m1.1-trustworthy-baseline`)
Reviewed branch: `m1.1-trustworthy-baseline`

Reviewer session/provider: openrouter / `openrouter/free`
Coder session/provider (brief §S3): openrouter / `minimax/minimax-m3.1-flash` (family: minimax)
Reviewer model family actually used: openrouter/free (not minimax; different from coder, satisfying independence)

## What I checked (commands run by me; outputs preserved verbatim)

### Git / commit inspection

```text
$ git log --oneline c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645..9aa24c32f5dcb04fd40d5610186046498929dde5
9aa24c3 docs: record the M1.1 validation results
8d413c1 fix: make the deploy lock case assert the missing-flock guard
```

Commit `8d413c1` carries implementation + agreed docs + brief; `9aa24c3` only adds `.ai/work/M1.1/validation.md`. Confirmed by `git show --stat`.

```text
$ git diff --stat c3e2c39..9aa24c3 -- server.mjs public/ package.json package-lock.json scripts/
0
```
All production surfaces byte-identical to base (verified via `git rev-parse` per file; 10 files listed in brief remain identical).

### Implementation diff (read, not just claimed)

`git diff c3e2c39..8d413c1 -- test/deploy.test.mjs` shows exactly:
- New `flockBinaryExists()` (lines 210–220), inspecting `PATH` with `accessSync(..., constants.X_OK)` without calling `scripts/deploy.mjs`.
- Guard branch (lines 225–234): when `!flockBinaryExists()`, asserts `/Cannot lock deploy because flock is missing\. The running service was not changed\./`, then `rmSync` and `return` — positive assertion, no skip/no-op/deletion.
- Real lock branch (lines 236–280) unchanged: second holder rejected (`assert.throws(..., /another deploy is running/i)` line 238); SIGKILL holder dead; `after = acquireDeployLock(held)` succeeds (line 274) and `after.release()`.

### Test suite (re-run by me on the committed head)

```text
$ npm test
...
ℹ tests 21
ℹ pass 21
ℹ fail 0
ℹ skipped 0
ℹ todo 0
```
Exit 0. The `deploy lock rejects a second holder...` case runs (line 87 of output, passes 14.7ms on this laptop — it takes the guard branch because `flock` is absent, which is correct).

Base count verification (separate detached worktree at `c3e2c39`, cleaned afterward): also `tests 21`, with the same case failing with the expected guard error (20 pass, 1 fail). No count drop.

### Mutation / test-design checks (scratch dirs `/private/var/folders/.../mutation-check` and `flock-emulation`; never written into repo)

Mutation 1 (pristine `scripts/deploy.mjs` altered so guard throws wrong message instead of `/Cannot lock deploy.../`): `npm test` exits 1, 20 pass, 1 fail, case names itself (`✖ deploy lock rejects...`), `AssertionError` shows expected regex vs actual `Another deploy is running...`. Confirms F1 / F2 — a broken contract is diagnosable and fails.

Mutation 2 (`scripts/deploy.mjs` made to refuse everywhere — always throws `Another deploy is running`): same failure on macOS (guard assertion expects the missing-flock message, not this one). Proves `flockBinaryExists()` being independent prevents a "refuse everywhere" deploy script from making the suite pass.

Floss-emulation (`flock` shim using Python `fcntl.LOCK_EX | LOCK_NB` on inherited `/dev/fd/3`, in scratch `flock-shim/` with `PATH` override): `npm test` exits 0, 21 pass. The real assertions ran: second holder rejected, SIGKILL holder dies, next acquire succeeds. This is an emulation (not util-linux), clearly labeled here.

### `npm run doctor`

```text
OK  Node 25.9.0; needs 22+
OK  git: git version 2.54.0
OK  npm: 11.14.0
OK  origin points to your team fork (verify the owner above)
OK  AGENTS.md exists
OK  IDEA.md exists
OK  PLAN.md exists
INFO  Deploy only inside your assigned Linux workshop guest. Use --dry-run elsewhere.
INFO  Doctor does not authenticate GitHub, verify team membership, SSH, DNS or hosted health.
INFO  Agent sign-in is separate; follow docs/agents.md.
```
Exit 0.

### `npm run deploy:preview`

```text
# /Users/drymertini/.config/systemd/user/vc-app.service.d/50-workshop-release.conf
[Service]
WorkingDirectory=/Users/drymertini/.local/share/vibecode-workshop/releases/9aa24c32f5dc-PREVIEW
Environment=APP_REVISION=9aa24c32f5dcb04fd40d5610186046498929dde5
ExecStart=/usr/bin/env npm start
PREVIEW ONLY: no install, build, tests, services or deployment state changed.
```
Before/after `ls` of `~/.config/systemd/user/vc-app.service.d/` and `~/.local/share/vibecode-workshop/`: both still absent. Nothing created or changed by the run (confirmed across two successive runs).

### Health / access / traversal (server started at `PORT=3011` with `APP_REVISION=test-sha-123`; stopped after)

- `GET /api/health` → HTTP 200, `content-type: application/json; charset=utf-8`, body `{"ok":true,"revision":"test-sha-123"}` (matches exported `APP_REVISION`).
- `GET /` → HTTP 200 HTML.
- `GET /style.css` → HTTP 200.
- `GET /AGENTS.md` / `/package.json` / `/.env` / `/.git/config` / `/public/../server.mjs` / `/%2e%2e/server.mjs` / `/..%2fserver.mjs` / `/%2e%2e%2fserver.mjs` / `/server.mjs` / `/IDEA.md` / `/PLAN.md` / `/package-lock.json` / `/.ai/work/M1.1/brief.md` → all 404.
- After `kill`; `lsof -i TCP:3011` → nothing listening. Server process gone.

### Committed documentation (verified by reading, not running)

`IDEA.md` and `PLAN.md` in `8d413c1` contain: goal (running-club board, post/run/join by name, survives reload/restart); solo-team session protocol (S1–S5 with model-family split, reviewer gets only brief/diff/validation.md, independence via session not second human); M1.1–M1.4 step list with scope cut order (names optional, pace free text, M1.2+M1.3 merged into one PR); session protocol (one writer, one checkout; reviewer does not edit); open questions (PR via browser because `gh` missing; Linux CI via enabled Actions or organiser guest). No silent edits to the agreed text compared to `.ai/sessions/2026-10-20-project-lead-solo-team.md` (the newer session supersedes the older one, which is preserved unchanged as history — confirmed by `git show 8d413c1:.ai/sessions/2026-10-20-project-lead-running-club.md` matching the base untracked copy).

`.ai/context.md`, `.ai/rules.md`, `.ai/pitfalls.md` updated consistently (pitfalls records the macOS `npm test` red as M1.1; rules notes `flock` need; context moves from M13.27 to M1 planning). All agreed.

Secrets / boundary check (reading): no key, host, port, URL, token, `app.env` content, `team-NN.key`, or private connection string entered in any committed file. `~/.local/share/vibecode-workshop/data/` and `~/.config/vibecode-workshop/app.env` untouched (not present, not read).

## Findings

- **SEVERITY: info / unproven — N5 (Linux green).** The fork has never run a `Check`. `curl -s https://api.github.com/repos/DryMertini/vibecode-workshop-teamhorse/actions/runs` → `total_count: 0`. `curl .../commits/9aa24c3.../status` → `state: "pending"`, `total_count: 0`; `/check-runs` → `{"message":"No commit found for SHA: ...","status":"422"}` (the commit exists locally and is correct; the API reflects it isn't pushed / no CI triggered). `docs/connect.md:44` and brief §Audit explicitly state: *"an absent run is not a passing check."* The Linux half of N5 is **unproven**. The human must enable Actions (fork → Settings → Actions) or get proof from the organiser's Linux guest. This does not block approval of the code; it is a required follow-up.
- **SEVERITY: info — design / platform branch.** The `flock`-present assertions were not executable on the laptop because macOS lacks util-linux `flock`. I exercised them using a Python `fcntl` emulation of `flock -n FD` (scratch `flock-shim/`, never in repo). The real assertions pass under emulation. To fully close the Linux half independently, either a real `ubuntu-latest` `Check` or the organiser's Linux guest is needed. The test design (independent `flockBinaryExists()`, real assertions preserved when present, guard assertion when absent) is sound; if the Linux branch had a hidden defect, the emulation showed the structure works, but it is not the real binary.
- **SEVERITY: info — independence / second family review.** I am the reviewer session (`openrouter/free`). The brief (§S4) expects the reviewer to differ from the coder (`minimax/minimax-m3.1-flash`). I do. The brief (§S4 / role brief) also states: *"A second, stronger review by the human using Claude Code or Codex against this same head SHA is expected and is not yet done."* I record that explicitly: this `review.md` is the independent session review; a stronger human review with Claude Code / Codex on `9aa24c3` is still expected and not claimed.
- **No blocking findings.** No implementation defect, no secret injection, no file altered outside brief, no test count reduced, no skip/no-op/deletion, no document silently edited, no server change, no deploy-state change.

## Verdict

**APPROVE** — the change at `9aa24c32f5dcb04fd40d5610186046498929dde5` (`m1.1-trustworthy-baseline`) satisfies the brief's acceptance criteria for what is verifiable on this macOS laptop.

Reason: only `test/deploy.test.mjs` was changed (plus the pre-agreed documentation carried onto the branch); the `deploy lock` case asserts the missing-flock guard positively where `flock` is absent (verified by running), keeps the real second-holder / SIGKILL-release assertions intact (verified by reading; exercised under emulation), uses a `flockBinaryExists()` helper independent of `scripts/deploy.mjs` (verified by reading the source), and the suite reports 21/21 with 0 skipped. No secrets, no product surface change, no deploy-state mutation.

Approval is **limited to the named SHA only** (`9aa24c3`). It does not claim a passing Linux CI (`N5` unproven — `actions/runs` = 0). It does not claim the second stronger review (expected from human Claude Code / Codex session, not yet done). It does not claim hosted deployment (M1.4 blocked; no team handout; no `gh`; no public URL). Those gaps are recorded above, not hidden.
