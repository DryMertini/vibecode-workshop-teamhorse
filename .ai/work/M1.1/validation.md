# M1.1 — Validation

**Base SHA:** `c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645` (`main`, equal to `origin/main` at audit time).
**Branch:** `m1.1-trustworthy-baseline`, created from that SHA. The dirty documentation travelled
with the branch (`git switch -c` keeps the working tree). Nothing was reset, restored, stashed or
deleted, and nothing was committed on `main`.
**Head of commit 1 (the change plus the agreed documentation):** `8d413c1dd696a609b7ed4137fce68b0a81068af8`
**Head of commit 2 (this evidence file):** the commit that adds `.ai/work/M1.1/validation.md` on the
same branch. It is the only commit after commit 1.
**Machine:** macOS Darwin 23.6.0 x86_64, Node v25.9.0, npm 11.14.0. `which flock` → not found
(exit 1). No util-linux `flock` on this laptop.

**Role:** coder (S3). This file records what was run and what was seen. It approves nothing.

## What changed

One file was touched: `test/deploy.test.mjs`. One case changed. No production code changed.

- `test/deploy.test.mjs` — the `deploy lock rejects a second holder and releases when the holder dies`
  case now runs on every platform. A new helper `flockBinaryExists()` looks for an executable
  `flock` in `PATH` **without asking `scripts/deploy.mjs`**, so the branch cannot be satisfied by a
  `deploy.mjs` that refuses to lock everywhere.
  - Where `flock` exists: the original assertions are unchanged and still run — a second holder is
    rejected with *"another deploy is running"*, and the lock is released when the holder dies,
    including after `SIGKILL`.
  - Where `flock` is absent (this laptop): the case asserts the guard error **positively** —
    `assert.throws(() => acquireDeployLock(path), /Cannot lock deploy because flock is missing\. The
    running service was not changed\./)`. No skip, no `t.skip`, no no-op, no deleted case, no
    reduced count.
- `scripts/deploy.mjs` — **not changed**. The production guard is already correct: it throws
  *"Cannot lock deploy because flock is missing. The running service was not changed."* when
  `spawnSync('flock', …)` fails with `ENOENT`, and it throws *"Another deploy is running. Wait for
  it to finish, then retry."* for a held lock. There was no evidence that the production behaviour
  is wrong, so it was left alone. `git diff c3e2c39 -- scripts/` is empty.

The suite has **21** cases before and **21** after; the reported count did not drop.

## Files changed

Commit 1 — `8d413c1dd696a609b7ed4137fce68b0a81068af8`:

| File | State |
|---|---|
| `test/deploy.test.mjs` | modified (the one case above) |
| `IDEA.md` | modified — committed exactly as it was on disk, content unchanged by the coder |
| `PLAN.md` | modified — committed exactly as it was on disk, content unchanged by the coder |
| `.ai/context.md` | modified — committed exactly as it was on disk, content unchanged by the coder |
| `.ai/rules.md` | modified — committed exactly as it was on disk, content unchanged by the coder |
| `.ai/pitfalls.md` | modified — committed exactly as it was on disk, content unchanged by the coder |
| `.ai/sessions/2026-10-20-project-lead-running-club.md` | added (was untracked) |
| `.ai/sessions/2026-10-20-project-lead-solo-team.md` | added (was untracked) |
| `.ai/work/M1.1/brief.md` | added (was untracked) |

Commit 2 — evidence only: `.ai/work/M1.1/validation.md` (this file).

**No file outside the brief's expected list was changed.** `server.mjs`, `public/index.html`,
`public/style.css`, `package.json`, `package-lock.json` and every file in `scripts/` are
byte-identical to the base SHA.

## Checks that were run

### `npm test`

```
$ npm test

> vibecode-workshop@1.0.0 test
> node --test

✔ page, CSS and health are reachable and health identifies the served revision (127.421661ms)
✔ repository files and traversal requests cannot be downloaded (54.762793ms)
✔ HEAD has no body and unsupported writes are rejected (31.923091ms)
✔ drop-in points the user service at a release without a system user or privilege directive (7.105037ms)
✔ preview names an uninstalled release and does not require the guest (0.807027ms)
✔ unsafe service interpolation is rejected before any unit can be installed (1.062437ms)
✔ guest guard accepts only the image contract and refuses each missing marker (0.633458ms)
✔ deploy refuses a dirty tree, a non-main branch, and the placeholder checkout (0.382342ms)
✔ releases cannot occupy the placeholder or application data (2.277587ms)
✔ recovery restores the previous drop-in or falls back to the placeholder unit (4.570448ms)
✔ deploy helper does not call a privilege tool or install a system unit (0.961298ms)
✔ prune keeps the active release and the rollback release (1.153418ms)
✔ a first deploy keeps only the active release when rollback is the placeholder (0.510875ms)
✔ an unreadable previous drop-in does not prune (0.371131ms)
✔ prune refuses paths outside the releases directory and deletes nothing (1.061318ms)
✔ install and build stay under the 3GiB guest limit (0.790017ms)
✔ memory delegation recognises only the memory controller (0.818488ms)
✔ deploy lock rejects a second holder and releases when the holder dies (10.704631ms)
✔ health wait failure format captures observations, expected revision, shape and vc-app logs (33.813396ms)
✔ memory scope OOM detection recognises scope Result oom-kill and signals (1.092432ms)
✔ smoke resolves local health on workshop guest and public health on laptop (0.996371ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 962.783424
exit=0
```

Summary line: `tests 21 / pass 21 / fail 0 / skipped 0 / todo 0`, exit 0. Same count as the audit,
no case skipped.

### `npm run doctor`

```
$ npm run doctor

> vibecode-workshop@1.0.0 doctor
> node scripts/doctor.mjs

OK  Node 25.9.0; needs 22+
OK  git: git version 2.54.0
OK  npm: 11.14.0
origin	git@github.com:DryMertini/vibecode-workshop-teamhorse.git (fetch)
origin	git@github.com:DryMertini/vibecode-workshop-teamhorse.git (push)
OK  origin points to your team fork (verify the owner above)
OK  AGENTS.md exists
OK  IDEA.md exists
OK  PLAN.md exists
INFO  Deploy only inside your assigned Linux workshop guest. Use --dry-run elsewhere.
INFO  Doctor does not authenticate GitHub, verify team membership, SSH, DNS or hosted health.
INFO  Agent sign-in is separate; follow docs/agents.md.
exit=0
```

Same `OK` lines as the audit. It prints the origin URL and still says it does not authenticate
GitHub, verify SSH, DNS or hosted health.

### `npm run deploy:preview`

```
$ ls -laR ~/.config/systemd/user ~/.local/share/vibecode-workshop   # before
ls: /Users/drymertini/.config/systemd/user: No such file or directory
ls: /Users/drymertini/.local/share/vibecode-workshop: No such file or directory

$ npm run deploy:preview

> vibecode-workshop@1.0.0 deploy:preview
> node scripts/deploy.mjs --dry-run

# /Users/drymertini/.config/systemd/user/vc-app.service.d/50-workshop-release.conf
[Service]
WorkingDirectory=/Users/drymertini/.local/share/vibecode-workshop/releases/8d413c1dd696-PREVIEW
Environment=PATH=/usr/local/Cellar/node/25.9.0_3/bin:/usr/local/bin:/usr/bin:/bin
EnvironmentFile=-/Users/drymertini/.config/vibecode-workshop/app.env
Environment=HOST=0.0.0.0
Environment=PORT=3000
Environment=APP_REVISION=8d413c1dd696a609b7ed4137fce68b0a81068af8
Environment=WORKSHOP_GIT_SHA=8d413c1dd696a609b7ed4137fce68b0a81068af8
ExecStart=
ExecStart=/usr/bin/env npm start
TimeoutStopSec=15

PREVIEW ONLY: no install, build, tests, services or deployment state changed.
exit=0

$ ls -laR ~/.config/systemd/user ~/.local/share/vibecode-workshop   # after
ls: /Users/drymertini/.config/systemd/user: No such file or directory
ls: /Users/drymertini/.local/share/vibecode-workshop: No such file or directory
```

Exit 0, the drop-in content is printed, the run ends with the `PREVIEW ONLY` line, and both
directories are byte-for-byte unchanged — they did not exist before and still do not exist. The
revision in the preview is the commit-1 head SHA, because that is what `HEAD` is on the branch.

### `GET /api/health`

```
$ APP_REVISION=probe-abc123 PORT=3011 npm start &
$ curl -i http://127.0.0.1:3011/api/health
HTTP/1.1 200 OK
x-content-type-options: nosniff
cache-control: no-store
content-type: application/json; charset=utf-8
Date: Tue, 20 Oct 2026 13:13:07 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"ok":true,"revision":"probe-abc123"}

$ server log
> vibecode-workshop@1.0.0 start
> node server.mjs

Workshop app listening on 0.0.0.0:3011
$ lsof -nP -iTCP:3011 -sTCP:LISTEN   # after stopping
nothing listening on 3011
```

HTTP 200, `content-type: application/json; charset=utf-8`, body exactly
`{"ok":true,"revision":"probe-abc123"}` — the exported `APP_REVISION`, not the literal
`development`. The server was started on port 3011, probed and stopped; nothing is listening on
3011 now.

### Access boundary (B1), same running server

```
/ -> 200
/style.css -> 200
/AGENTS.md -> 404
/package.json -> 404
/.env -> 404
/public/../server.mjs -> 404
/%2e%2e/server.mjs -> 404
/public/..%2fserver.mjs -> 404
```

### Product surface (B4)

```
$ git diff c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645 -- server.mjs public/ package-lock.json package.json scripts/
exit=0 (no output = unchanged)
```

### Preview failure path (F3)

```
$ cd /private/var/folders/bv/h2m0mgq14d3gc504mn6xqtnc0000gn/T/opencode   # not a git repository
fatal: not a git repository (or any of the parent directories): .git
git-exit=128

$ node /Users/drymertini/teamhorse/vibecode-workshop-teamhorse/scripts/deploy.mjs --dry-run
FAIL git rev-parse HEAD failed (exit 128)
exit=1

$ ls -laR ~/.config/systemd/user ~/.local/share/vibecode-workshop   # after the failure
ls: /Users/drymertini/.config/systemd/user: No such file or directory
ls: /Users/drymertini/.local/share/vibecode-workshop: No such file or directory
```

The preview fails loudly (exit 1) and harmlessly: no unit written, no release directory, no
service touched.

## The suite still fails on a broken lock contract (F1, F2)

A green run must be reachable only by correct behaviour. Three mutations of `scripts/deploy.mjs`
were run in **throwaway copies outside the repository** (the repository's own `scripts/deploy.mjs`
was never modified). Each mutation made the `deploy lock …` case fail and the case named itself.

```
=== mutation A: deploy.mjs guard branch removed (flock missing reported as 'another deploy is running') ===
✖ deploy lock rejects a second holder and releases when the holder dies (19.232009ms)
ℹ tests 18
ℹ pass 17
ℹ fail 1
ℹ skipped 0
ℹ todo 0
exit=1

=== mutation B: acquireDeployLock never locks and never refuses ===
✖ deploy lock rejects a second holder and releases when the holder dies (6.487467ms)
ℹ tests 18
ℹ pass 17
ℹ fail 1
ℹ skipped 0
ℹ todo 0
exit=1

=== mutation C: lock survives a dead holder (O_EXCL file lock instead of flock) ===
✖ deploy lock rejects a second holder and releases when the holder dies (418.772259ms)
ℹ tests 18
ℹ pass 17
ℹ fail 1
ℹ skipped 0
ℹ todo 0
  Error: Another deploy is running. Wait for it to finish, then retry.
exit=1
```

- **A** removes the `ENOENT` branch, so a missing `flock` is reported as *"another deploy is running"*.
  The guard assertion catches it. This is the N4/F1 property "the guard error is raised when flock
  is missing".
- **B** makes `acquireDeployLock` neither lock nor refuse. The guard assertion catches it.
- **C** replaces the `flock` lock with an `O_EXCL` file lock that survives a dead holder, so a
  `SIGKILL`ed deploy blocks the next one. The "released when the holder dies" assertion catches
  it with *"Another deploy is running."*

Mutations A and B run on this laptop as they are. Mutation C needs a machine with `flock`, so it
was run against the `flock`-present branch (see the next section).

### The `flock`-present branch is live code, not dead code (N3)

macOS has no `flock`, so the branch that asserts the real lock behaviour cannot be reached with
the real binary on this laptop. To check that the branch is genuinely exercised and green, a
**local stand-in** for `flock` was written into a temporary directory (Python's `fcntl.flock` on the
inherited fd 3, `-n` → exit 1 when the lock is held — the same contract util-linux `flock` offers).
It lives outside the repository, is not committed, and is not installed anywhere.

```
$ PATH="<tmp>/m1.1-shim:$PATH" npm test
✔ deploy lock rejects a second holder and releases when the holder dies (1359.749277ms)
ℹ tests 21
ℹ pass 21
ℹ fail 0
ℹ skipped 0
ℹ todo 0
exit=0
```

With a `flock` present, the case takes the real branch: the second holder is rejected with
*"another deploy is running"*, and after the holder child is `SIGKILL`ed the next acquire succeeds.
This is an **emulation of `flock`, not util-linux `flock`**, and it is not the Linux proof — see
N5 below.

## Acceptance cases

| Case | Result | Evidence |
|---|---|---|
| **N1** suite green on this laptop | **satisfied** | `npm test` exit 0, `fail 0`, `skipped 0`, `todo 0` |
| **N2** no test removed or neutered | **satisfied** | 21 tests before and after; the `deploy lock …` case is present and runs; no `skip`/`todo` in the source |
| **N3** real lock behaviour asserted where `flock` exists | **satisfied locally, not on Linux** | the original assertions are unchanged and run when `flock` is present (see the `flock` stand-in run and mutation C). The authoritative proof on Linux is still open — see N5 |
| **N4** the guard error asserted where `flock` is absent | **satisfied** | the case asserts `/Cannot lock deploy because flock is missing\. The running service was not changed\./` positively on this laptop; mutation A shows it fails when the guard is broken |
| **N5** the same suite green on Linux | **NOT PROVEN — open for the human** | see "What could not be verified" |
| **N6** `npm run doctor` reports OK | **satisfied** | exit 0, the same `OK` lines as the audit |
| **N7** `deploy:preview` prints the unit and changes nothing | **satisfied** | exit 0, drop-in printed with `ExecStart=/usr/bin/env npm start` and `Environment=APP_REVISION=…`, `PREVIEW ONLY` last line; both directories unchanged before/after |
| **N8** `GET /api/health` unchanged | **satisfied** | 200, `application/json; charset=utf-8`, body `{"ok":true,"revision":"probe-abc123"}` with `APP_REVISION=probe-abc123` exported |
| **N9** the agreed plan is committed | **satisfied** | commit 1 carries `IDEA.md`, `PLAN.md`, `.ai/context.md`, `.ai/rules.md`, `.ai/pitfalls.md`, both `.ai/sessions/2026-10-20-project-lead-*.md` files and the brief, with their content unchanged; `git status` is clean |
| **F1** a broken lock contract still fails the suite | **satisfied** | mutations A, B and C each produce a red run |
| **F2** the failing case names itself | **satisfied** | all three mutation runs print `✖ deploy lock rejects a second holder and releases when the holder dies` |
| **F3** `deploy:preview` fails loudly and harmlessly | **satisfied** | exit 1 with `FAIL git rev-parse HEAD failed (exit 128)`, nothing written, no service touched |
| **B1** nothing outside `public/` is reachable | **satisfied** | `/` and `/style.css` → 200; `/AGENTS.md`, `/package.json`, `/.env` and three traversal forms → 404 (also covered by the `repository files and traversal requests cannot be downloaded` case) |
| **B2** the guest-side deploy guard is not weakened | **satisfied** | `scripts/deploy.mjs` is unchanged; `git diff c3e2c39 -- scripts/` is empty, so both lock messages are byte-identical |
| **B3** no secrets or host details in the repo | **satisfied** | no key, token, guest host, assigned URL or credential is in any commit. The only address in the committed evidence is the loopback address `127.0.0.1` on port 3011, a locally chosen ephemeral port used for the health check in this report — the same shape as the `http://127.0.0.1:3000/api/health` already in `AGENTS.md`. `~/.local/share/vibecode-workshop/data/` and `~/.config/vibecode-workshop/app.env` were never read or written — neither path exists on this machine |
| **B4** no product surface changed | **satisfied** | `git diff c3e2c39 -- server.mjs public/ package-lock.json package.json scripts/` is empty |
| **U1** no UI change | **not applicable** | this step changes no UI. The starter page was served on port 3011 and returned 200; no browser inspection was performed, and none is claimed |

## What could not be verified, and why

1. **N5 — the suite is green on Linux. UNPROVEN.** This fork has never run a workflow
   (`https://api.github.com/repos/DryMertini/vibecode-workshop-teamhorse/actions/runs` →
   `total_count 0` at audit time), because Actions are disabled for a new fork. Enabling them is a
   human action in the browser (fork → Settings → Actions). Until a `Check` run on
   `ubuntu-latest` exists for this step's head SHA, the Linux half of N5 stays unproven and must
   be reported as unproven. An absent run is not a passing check. The `flock` stand-in run above is
   an emulation, not a substitute.
2. **The real lock behaviour on util-linux `flock`.** Only emulated locally, for the reason above.
   The real assertion still runs on the CI runner; nobody has seen it run there.
3. **`npm ci` was not run.** The step forbids installing, and `package-lock.json` has no
   dependencies, so there was nothing to install. `package-lock.json` is unchanged in this step.
4. **No browser inspection.** U1 is "none required" and this step changes no UI. The page was
   fetched over HTTP (200) and the health endpoint was checked; no claim is made about the
   rendering or the browser console.
5. **No deployment, no guest, no hosted check.** `npm run deploy` was not run, there is no team
   handout, no URL and no guest on this machine. Nothing was installed, built, restarted or
   published anywhere.

## Handoff

- **Head to review:** commit 1 `8d413c1dd696a609b7ed4137fce68b0a81068af8`, plus commit 2 (this
  file) on `m1.1-trustworthy-baseline`. `git diff c3e2c39…HEAD` is the whole change.
- **Working tree:** clean after commit 2.
- **Not done by the coder, on purpose:** merge, push, pull request, approval, deployment, and
  enabling GitHub Actions.
