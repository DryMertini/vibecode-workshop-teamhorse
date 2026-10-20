# M1.1 — A trustworthy local baseline

## Outcome

After this step:

- The team can run `npm test` on this macOS laptop and get a **green run that means something**, and the same suite is green on Linux. A red/green result is a signal, not a platform artefact.
- The agreed goal and plan are **committed** on the team's fork instead of living only in a working tree.
- The deploy-lock case keeps its real assertions where `flock` exists and asserts the clear "flock is missing" guard error where it does not.
- The starter still meets the deploy contract: `npm run doctor` reports OK, `npm run deploy:preview` prints the proposed unit and changes nothing, `GET /api/health` answers 200 `{"ok": true, "revision": "..."}`.
- Two **human-only** decisions are named instead of guessed: how a PR is opened, and how a Linux CI run is obtained.

No product feature ships in this step. It changes no product behaviour.

## Audit

**Base SHA: `c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645` (`c3e2c39`)** — `main`, identical to `origin/main` at audit time.
**Origin: `git@github.com:DryMertini/vibecode-workshop-teamhorse.git`** (the team fork; it is a GitHub *fork* of the workshop starter `ikodo0/vibecode-workshop`).

### Git state — the agreed plan is uncommitted and must be preserved

`git status` at audit time:

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
	modified:   .ai/context.md
	modified:   .ai/pitfalls.md
	modified:   .ai/rules.md
	modified:   IDEA.md
	modified:   PLAN.md

Untracked files:
	.ai/sessions/2026-10-20-project-lead-running-club.md
	.ai/sessions/2026-10-20-project-lead-solo-team.md
```

`git diff --stat` → 5 files changed, 142 insertions(+), 35 deletions(-). These changes are the newly agreed goal and plan. **They are part of M1.1's deliverable. Nobody may reset, restore, stash-drop or discard them.** The coder carries them onto the step branch and commits them there.

### Real starting behaviour (commands actually run, 2026-10-20, macOS Darwin 23.6.0 x86_64, Node v25.9.0, npm 11.14.0)

`npm test` → **exit 1**. `ℹ tests 21 / ℹ pass 20 / ℹ fail 1 / ℹ skipped 0 / ℹ todo 0`. The single failure:

```
✖ deploy lock rejects a second holder and releases when the holder dies
  Error: Cannot lock deploy because flock is missing. The running service was not changed.
      at acquireDeployLock (scripts/deploy.mjs:165:13)
      at TestContext.<anonymous> (test/deploy.test.mjs:210:17)
```

`which flock` → `flock not found` (exit 1). macOS ships no util-linux `flock`; `scripts/deploy.mjs` shells out to it in `acquireDeployLock` (`scripts/deploy.mjs:157-179`) and already throws the guard error above when the binary is absent. The **test** calls `acquireDeployLock` without accounting for that, so it fails instead of asserting the guard.

`npm run doctor` → **exit 0**, all lines `OK` (Node 25.9.0 needs 22+; git 2.54.0; npm 11.14.0; `origin` points to the team fork; `AGENTS.md`/`IDEA.md`/`PLAN.md` exist) plus three `INFO` lines. Note it prints the origin URL and says it does not authenticate GitHub, verify SSH, DNS or hosted health.

`npm run deploy:preview` → **exit 0**. Prints the proposed drop-in `~/.config/systemd/user/vc-app.service.d/50-workshop-release.conf` with `WorkingDirectory=…/releases/c3e2c3936c0c-PREVIEW`, `Environment=APP_REVISION=c3e2c3936c0c…`, `ExecStart=/usr/bin/env npm start`, and ends with `PREVIEW ONLY: no install, build, tests, services or deployment state changed.`

`npm start` + `curl -i http://127.0.0.1:3000/api/health` → **HTTP/1.1 200 OK**, `content-type: application/json; charset=utf-8`, body `{"ok":true,"revision":"probe-abc123"}` with `APP_REVISION=probe-abc123` exported (the server echoes `process.env.APP_REVISION`). `/` → 200; `/AGENTS.md` → 404; `/package.json` → 404; `/.env` → 404. `server.mjs:25-26` serves only `/` and `/style.css` from a hard-coded map.

`npm ci` → **exit 0**, `up to date, audited 1 package`. `package-lock.json` is tracked (`git ls-files` → `package-lock.json`, `package.json`) and has no dependencies.

### Findings that contradict assumptions in `PLAN.md` — read these

1. **This fork has never run CI.** `curl https://api.github.com/repos/DryMertini/vibecode-workshop-teamhorse/actions/workflows` → `total_count 0`; `…/actions/runs` → `total_count 0`; `…/commits/c3e2c39…/check-runs` → `total_count 0`. The same request against the upstream starter `ikodo0/vibecode-workshop` returns **1 active workflow and 11 runs (several green)**, and against `nodejs/node` returns 55 — so the requests are correct and the fork genuinely has Actions **disabled** (the default for a new fork). `docs/connect.md:44` says it plainly: *"Open your fork's Actions tab and enable workflows if GitHub asks. Confirm a `Check` run appears after your first push; **an absent run is not a passing check**."* The workflow file itself is present on `origin/main` (320 bytes) and byte-identical to upstream: `runs-on: ubuntu-latest`, `npm ci` then `npm test`. **So "CI is green because ubuntu-latest has flock" is an unverified belief for this fork.** Enabling Actions is a human action in the browser, like opening the PR.
2. **No `gh` CLI** — `which gh` → `gh not found` (exit 1). No session can open a PR.
3. **No team hosting** — no `team-NN.md` handout, no `team-NN.key`, no `team-NN.known_hosts`, no assigned port/URL, no `.workshop.local.md`; `~/.ssh/known_hosts` contains only `github.com`. (`~/.ssh/vibecode_2026` is the human's **personal** key, comment `drymertini@Merts-MacBook-Pro.local`.) Nothing may be deployed; **M1.4 stays blocked on the organiser.**
4. **No Linux runner on this machine** — `which docker podman colima lima` → all not found. The Linux half of the suite can therefore only be proven by a `Check` run on the fork's `ubuntu-latest` workflow or by the organiser's Linux guest.

### Assumptions checked

| Assumption | Check | Result |
|---|---|---|
| Base is `c3e2c39` | `git rev-parse HEAD`, `git rev-parse origin/main` | both `c3e2c39…` — confirmed |
| Origin is the team fork | `git remote -v`; GitHub API `fork: true, parent: ikodo0/vibecode-workshop` | confirmed |
| macOS lacks `flock` | `which flock` | confirmed, exit 1 |
| The guard error already exists | `scripts/deploy.mjs:165` | confirmed: *"Cannot lock deploy because flock is missing. The running service was not changed."* |
| `gh` is missing | `which gh` | confirmed, exit 1 |
| No hosting | home dir, repo root, `~/.ssh` | confirmed, no handout |
| Lockfile committed | `git ls-files package-lock.json` | confirmed, tracked, zero dependencies |
| `.ai/work/` is committable | `git check-ignore .ai/work/M1.1/brief.md` | exit 1 — **not** ignored, evidence can be committed |

## Acceptance

Each item is a checkable result. The reviewer re-runs them; a claim in `validation.md` is not evidence.

### Normal

- [ ] **N1 — the suite is green on this laptop.** `npm test` exits 0 and its summary reports `fail 0`, `skipped 0`, `todo 0`.
- [ ] **N2 — no test was quietly removed or neutered.** The reported test count is **not lower than the starting 21**, and the `deploy lock …` case is still present in the suite and still runs (it may change what it asserts, not whether it runs).
- [ ] **N3 — where `flock` exists, the lock behaviour is genuinely asserted.** On a machine with `flock`, the case proves: a second holder is rejected with the *"another deploy is running"* error; the lock is **released when the holder dies** (including `SIGKILL`), so the next acquire succeeds. This must remain a real assertion on Linux, not a fallback path.
- [ ] **N4 — where `flock` does not exist, the case asserts the clear guard error instead of failing.** On this laptop the same case passes by asserting the *"flock is missing"* guard error — a **positive assertion**, not a skip, not a no-op, and not a deleted case.
- [ ] **N5 — the same suite is green on Linux.** A `Check` run on `ubuntu-latest` for this step's head SHA is green. If the fork's Actions are still disabled, the reviewer records that fact and the human is asked to enable them (fork → Settings → Actions) — an absent run is **not** a passing check.
- [ ] **N6 — `npm run doctor` reports OK** and exits 0, with the same `OK` lines as the audit (Node ≥22, git, npm, origin points to the team fork, `AGENTS.md`/`IDEA.md`/`PLAN.md` exist).
- [ ] **N7 — `npm run deploy:preview` prints the proposed unit and changes nothing.** It exits 0, prints the `50-workshop-release.conf` drop-in content including `ExecStart=/usr/bin/env npm start` and `Environment=APP_REVISION=…`, and ends with the `PREVIEW ONLY` line. The state of `~/.config/systemd/user/vc-app.service.d/` and `~/.local/share/vibecode-workshop/releases/` is **byte-for-byte unchanged** before and after the run.
- [ ] **N8 — `GET /api/health` is unchanged.** HTTP 200, `content-type: application/json; charset=utf-8`, body exactly `{"ok":true,"revision":"<APP_REVISION>"}`, and the revision equals the exported `APP_REVISION` (not the literal `development`).
- [ ] **N9 — the agreed plan is committed.** `IDEA.md` and `PLAN.md` are committed in their agreed form, together with `.ai/context.md`, `.ai/rules.md`, `.ai/pitfalls.md` and the two untracked `.ai/sessions/2026-10-20-project-lead-*.md` files. After the coder's commit, `git status` is clean and no uncommitted change from the audit was lost. The contents must match the agreed text: no silent edits to the goal, the step list, the scope cut order or the session protocol.

### Empty or failure

- [ ] **F1 — a broken lock contract still fails the suite.** If the guard error is not raised when `flock` is missing, or the lock is not released when the holder dies, the suite fails and `npm test` exits non-zero. A green run must be reachable only by correct behaviour, not by weakening the assertion.
- [ ] **F2 — the failing case names itself.** A deliberate local red run shows the case name in the output (the audit failure said `deploy lock rejects a second holder and releases when the holder dies`), so a red run on any machine is diagnosable.
- [ ] **F3 — `deploy:preview` fails loudly and harmlessly.** If the preview cannot render, it exits non-zero and writes no unit; it never installs, builds, restarts a service or creates a release directory.

### Access / data boundary

- [ ] **B1 — nothing outside `public/` becomes reachable.** `/AGENTS.md`, `/package.json`, `/.env`, `/.git/config`, `/public/../server.mjs` and encoded traversal all answer **404**; `/` and `/style.css` still answer 200.
- [ ] **B2 — the guest-side deploy guard is not weakened.** On the Linux guest, `acquireDeployLock` still refuses a second deploy and still releases the lock when the process dies, including after `SIGKILL`; the *"another deploy is running"* message is unchanged. If `scripts/deploy.mjs` is touched at all, the diff is justified in `validation.md` and the two other lock messages are byte-identical.
- [ ] **B3 — no secrets or host details enter the repo.** No private key, host address, port, URL, token or `app.env` content in any commit. `~/.local/share/vibecode-workshop/data/` and `~/.config/vibecode-workshop/app.env` are neither read into evidence nor modified.
- [ ] **B4 — no product surface changed.** `server.mjs`, `public/index.html` and `public/style.css` are byte-identical to the base SHA (`git diff c3e2c39 -- server.mjs public/` is empty). No dependency is added, so `package-lock.json` is unchanged; the starter keeps zero runtime dependencies and no build step.

### Browser task

- [ ] **U1 — none required.** There is no UI change in this step. If the reviewer opens `http://127.0.0.1:3000/`, it must render the unchanged starter page, and the browser console must be clean. Record it if done; do not claim a UI review of anything else.

## Boundaries and dependencies

**Must remain true (the deploy contract in `AGENTS.md` and `docs/deploy.md`):**

- `scripts/deploy.mjs`, `scripts/smoke.mjs`, `scripts/doctor.mjs` stay in the repository; `package.json` keeps `deploy`, `smoke`, `doctor`, `test` and `start`.
- `package-lock.json` stays committed; deployment runs `npm ci` inside a 2G memory-bounded scope.
- `start` keeps listening on `PORT` (default 3000) bound to `0.0.0.0`/`127.0.0.1`.
- `/api/health` keeps returning `{"ok": true, "revision": "..."}` matching `process.env.APP_REVISION`.
- `test/app.test.mjs` keeps importing `../server.mjs` and `test/deploy.test.mjs` keeps importing `scripts/`. Deploy runs `npm test` first and refuses on failure, so a **green suite is a deployment precondition**.
- Only files under `public/` are web assets. Durable data lives outside the release directories.
- One step = one branch = one reviewable PR, merged through a PR **inside the team fork** (`DryMertini/vibecode-workshop-teamhorse`), never against the workshop starter.

**Out of scope for M1.1:**

- Any product feature: no run posting, no "I'm in", no board, no persistence. That is M1.2/M1.3.
- No framework change, no dependency, no build step, no new npm script beyond what the contract requires.
- **No deployment, no release, no guest access.** There is no handout, no URL and no guest; `npm run deploy` must not be run. M1.4 is blocked on the organiser.
- No change to the agreed goal, the plan's step list, the scope cut order or the session protocol — those are the human's, and they are already agreed.
- No deletion, reset, restore or stash of the dirty documentation.

**Dependencies:**

- M1.1 needs nothing merged. **M1.2 depends on M1.1** and must not start before M1.1 is merged into `main`.
- M1.4 remains blocked on the organiser's team handout (key, port, URL). Chase it in parallel; it is not a coding task.

**Open questions for the human (not coding tasks, do not implement a workaround):**

1. **How are pull requests opened?** `gh` is not installed. Either install `gh` (then `gh auth login` with the human's own account) or open every PR in the browser against `DryMertini/vibecode-workshop-teamhorse`. The committer needs this before the PR exists.
2. **How is the Linux CI run obtained?** This fork has never run a workflow. Either the human enables Actions in the fork (Settings → Actions) so `Check` runs on `ubuntu-latest`, or the Linux proof comes from the organiser's Linux guest. Until one of these happens, the Linux half of N5 is **unproven** and must be reported as unproven — not asserted.
3. M1's human owner is the same human (one-person team); milestone acceptance is theirs.

## Handoff

- **Human owner:** the same human (one-person team). Owns goal, taste, scope and the milestone release decision.
- **Base SHA:** `c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645` (`c3e2c39`), `main` == `origin/main`.
- **Branch:** `m1.1-trustworthy-baseline`, created **from `main` at that SHA**. The dirty documentation is carried onto the branch (`git switch -c` keeps the working tree) and committed **on the branch** — never reset, never committed directly on `main`.
- **Evidence paths:** `.ai/work/M1.1/brief.md` (this file), `.ai/work/M1.1/validation.md` (coder), `.ai/work/M1.1/review.md` (reviewer). Not git-ignored; commit them.

**Expected files the coder changes** (the coder may adjust this list, and must say so in `validation.md`):

- `test/deploy.test.mjs` — the `deploy lock …` case: make it assert the guard error where `flock` is absent and keep the real lock assertions where it exists.
- `scripts/deploy.mjs` — **only if** the coder shows the current production behaviour is wrong; the guard error already exists and is correct, so the default expectation is no change here (see B2).
- `IDEA.md`, `PLAN.md`, `.ai/context.md`, `.ai/rules.md`, `.ai/pitfalls.md` — committed as already agreed, content unchanged.
- `.ai/sessions/2026-10-20-project-lead-running-club.md`, `.ai/sessions/2026-10-20-project-lead-solo-team.md` — added (currently untracked).
- `.ai/work/M1.1/validation.md` — new, written by the coder.

**Session sequence (run them in this order, one writer at a time):**

1. **S3 — coder.** Model family `cohere/north-mini-code`. Reads this brief, `.ai/roles/coder.md`, `AGENTS.md`. Implements M1.1 on `m1.1-trustworthy-baseline`, commits it, runs the checks, and writes `.ai/work/M1.1/validation.md` with the exact commands, their real output, the base/head SHAs, and any check it could not run (Linux CI, for example) stated plainly. It does not merge and does not approve its own work. If a blocker appears — for example Actions cannot be enabled by the coder — it stops and reports instead of weakening an acceptance case.
2. **S4 — reviewer.** A **different model family** from the coder (the minimax family, e.g. `minimax/minimax-m3.1-flash`; **not** `cohere/north-mini-code`). It receives **only** this brief, the committed diff (`git diff c3e2c39…<head>`) and `validation.md` — **no narrative**, no chat, no summary of intent. It re-runs `npm test`, `npm run doctor`, `npm run deploy:preview` and the health check itself, states what it did not verify, checks N1-N9, F1-F3, B1-B4, and writes `.ai/work/M1.1/review.md` from `.ai/templates/review.md` with the base and head SHAs, the provider and model for **both** sessions, an explicit verdict (`APPROVE` or `REQUEST CHANGES`) and the reason. It does not edit the branch and does not merge. **A strong second review is the human's own Claude Code or Codex session against the same head SHA.**
3. **S5 — committer.** Model family: any. Verifies `git rev-parse <branch>` equals the **approved** head SHA (a new SHA needs re-review), opens the PR **inside the team fork** — the human opens it in the browser, because `gh` is missing — merges exactly that SHA once CI is green, then updates `PLAN.md` (M1.1 row → merged, with the PR link), `.ai/context.md` and adds a session handoff in `.ai/sessions/`. It deploys nothing; a deployment needs the human's explicit milestone release instruction, and there is no guest to deploy to.

**This brief was written by the milestone lead session** (provider `openrouter`, model `minimax/minimax-m3.1-flash`). It contains no implementation and no code changes; the lead audited the state and wrote this file only.
