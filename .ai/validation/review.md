# Starter review

Base SHA: none (root commit)
Head SHA: 5983b752622f3a50ef4a52e9f3782afd77802015
Reviewed history: 1b9acd0b888affcdeee22184062faf9aff2862df (full review), then 581526c and 5983b75, both docs-only and both landed during the review (delta reviews below). The writer was not idle during this review (AGENTS.md rule 4). Any further commit needs its own re-review.
Reviewer session/provider: Claude Code (Claude model family), a one-off review session launched through Orca. This session did not write the change and did not edit any file except this one.
Date: 2026-10-18

## What I checked

Scope: all 39 files in the root commit, especially AGENTS.md, README.md, docs/, .ai/, server.mjs, scripts/, test/, CI and .ai/validation/starter.md.

| Acceptance | Evidence (actually run unless marked "by reading") | Result |
|---|---|---|
| Node 22 starter works | Downloaded the official Node v22.23.3 linux-x64 binary and checked its SHA256 against nodejs.org SHASUMS256. With it: `npm ci` (0 packages), `npm test` 5/5 pass, `node --test` 5/5 pass, `npm run doctor` reports Node 22.23.3 OK. Also 5/5 pass on host Node v26.11.1. | Pass |
| Server boundaries | Node 22, real HTTP via curl: `/`, `/style.css` and `/api/health` return 200 with correct types. `/.env`, `/server.mjs`, `/index.html`, `/..%2fserver.mjs`, `/%2e%2e%2fserver.mjs` and `//etc/passwd` (with `--path-as-is`) return 404. A malformed request line returns 400. HEAD `/api/health` returns 200 with nosniff and no-store. A second instance on a busy port exits 1 (EADDRINUSE). `PORT=abc` exits 1. SIGTERM exits 0. | Pass |
| Browser | Headless Chromium via CDP at 1440×1000 and 375×812 against a local server. Title, h1 and 3 steps render; `scrollWidth == clientWidth` at both widths; no element extends past the viewport. The footer health link fetch returned `{ok:true, revision:"review-check"}`. Screenshots were inspected visually and kept outside the repo. The only console error was a `/favicon.ico` 404; there were no JS exceptions. | Pass |
| Deploy preview / guard | `npm run deploy:preview` prints the unit and changes nothing. Real `npm run deploy` as a non-student user is refused. Unknown flag is refused. | Pass |
| Deployment failure/rollback and preservation | Ran the **real, unmodified** `scripts/deploy.mjs` on a scratch clone outside the repo. An `--import` preload faked `os.userInfo().username` as `student` and redirected only the `/etc/systemd/system/workshop-app.service` path. Fake `sudo` and `systemctl` on PATH tracked enabled/active state and actually started the app and a hello server on 127.0.0.1:3000. Systemd semantics such as `Restart=` and `EnvironmentFile` were **not** simulated. Scenarios: (a) first deploy over an active and enabled hello: hello stopped and disabled, app enabled, health reports the HEAD revision. (b) Good deploy, then a committed `main` whose server throws on startup: tests still pass, the health window expires, the previous unit is reinstalled, enabled and started, and :3000 serves the old revision. Both release dirs are retained. Output: "Previous service configuration restored". (c) Broken first deploy over hello: unit removed, hello re-enabled and restarted, :3000 serves hello, failed release retained. (d) Refusals: non-main branch, dirty checkout, non-root cwd. | Pass; matches docs/deploy.md:22 and :63 |
| Preservation by reading | No `rm` of releases or data anywhere. The only delete is `rm -f` of the unit file when no previous unit existed (deploy.mjs:111). Test, install and build all run before any service change, which matches deploy.md:57. | Pass |
| Unit interpolation | `serviceUnit` regexes reject newline, `%` specifier, `$()` and relative paths. Revision must be 40–64 hex characters. Covered by test/deploy.test.mjs. | Pass |
| Leaks | `git grep` on HEAD for IPv4, hostnames, token, key and password patterns, and AI attribution. Only public URLs (github.com, intra.land, docs and vendor sites) and loopback/0.0.0.0 appear. The author and committer are a GitHub noreply address. The commit has no trailers. `.ai/private/` and `.ai/browser/` are ignored and untracked. | Pass |
| Instruction coherence | Read README → connect → deploy → agents → workflow → roles/templates against AGENTS.md. Fork-per-team, PRs inside the fork, laptop agents with a public-fork clone in the container, and the role chain project lead → milestone lead → coder → reviewer → committer are consistent. Release requires an explicit team instruction everywhere. Linked install and quickstart URLs for Codex, Claude Code and gh return 200. | Pass, with F2 |

Not checked (organiser live-rehearsal limits, not blockers in this commit):

- No team container, SSH gateway, DNS, tunnel, TLS, public URL or real systemd. The real `team-hello.service` name and student/passwordless-sudo provisioning are untested.
- Reboot behaviour, rename/rejoin, and private-fork credentials are untested.
- CI was not run: the repo has no remote, and https://github.com/ikodo0/vibecode-workshop currently returns 404. The README fork links work only after publication.
- No participant agent login was performed.

I make no claim of independent hosted proof.

## Findings

**F1 — Medium (evidence accuracy), .ai/validation/starter.md:7.**
- The line says "`npx -y node@22 --test`: the same five tests passed under Node 22." On this host, `npx -y node@22 --version` prints **v26.11.1**: npm resolves `node` to the system binary, so that command did not run Node 22.
- The underlying claim is true: I reproduced 5/5 on a verified v22.23.3 binary. The recorded evidence is not.
- Required outcome: correct the line to name a check that actually ran Node 22, including its `node --version` output. This is a report-only change. Per docs/workflow.md:23 it does not require implementation re-review, but whoever commits it must confirm no implementation files changed.

**F2 — Low, docs/connect.md:36–41.**
- Teammates are told `gh repo clone YOUR-OWNER/YOUR-FORK`. For a fork, gh adds an `upstream` remote pointing at the starter, and only the fork owner's path runs `gh repo set-default`.
- Concrete case: a teammate's agent runs `gh pr create` without `--repo`, and gh either prompts or resolves to the starter.
- Mitigations already exist: workflow.md:31 passes `--repo` and connect.md:82 has a troubleshooting row.
- Recommended: add `gh repo set-default YOUR-OWNER/YOUR-FORK` to the teammate clone block.

**F3 — Low, scripts/deploy.mjs:83–119.**
- Interrupting deploy with Ctrl-C or SIGTERM during the 15–30 s health window bypasses the `catch` recovery.
- Concrete case: on a first deploy, the new unit is installed and hello is stopped but still enabled, and no recovery message appears.
- Recommended: one sentence in docs/deploy.md telling participants not to interrupt the deploy, and to ask the organiser if it was interrupted. Alternatively, handle signals in the helper. Not a blocker.

**Info:**
- **Hello unit name.** The helper hard-codes `team-hello.service`; docs/organiser.md:10 should name it so the rehearsal confirms it. By reading the code, a different name fails safely: the app gets EADDRINUSE, the revision check fails, and recovery runs without touching the unknown hello service.
- **EnvironmentFile precedence.** systemd lets `EnvironmentFile=` override `Environment=` regardless of line order, so the warning at deploy.md:46 is necessary and correct. A wrong `APP_REVISION` or `PORT` is caught by the revision health check.
- **network-online ordering.** `After=network-online.target` without `Wants=` has no ordering effect. This is harmless for a 0.0.0.0 listener.
- **Favicon.** The `/favicon.ico` 404 is console noise; starter.md's "no page errors" holds for JS exceptions.

## Re-review of 581526c

Commit 581526c ("docs: clarify participant setup and correct runtime evidence") landed while this review was in progress.

- **Scope.** `git diff --stat 1b9acd0 581526c` excluding Markdown is empty: only `.ai/validation/starter.md` and `docs/connect.md` changed. No implementation changed.
- **Tests.** Still 5/5 on Node v22.23.3.
- **F1 resolved.** starter.md now states that the `npx` run used Node 26, and records a SHA-256-verified Node 22.23.3 binary run. This matches my independent result.
- **New smoke claim reproduced.** On Node 22 against a local server:
  - `APP_REVISION=<HEAD>` → `OK`, exit 0.
  - `APP_REVISION=deadbeef` → `FAIL Revision differs`, exit 1.
  - A URL with embedded `u:p@` is rejected, exit 1.
- **connect.md additions are accurate.** They add the laptop prerequisites and a reminder to enable Actions in the fork; GitHub disables workflows in new forks until enabled. No leak patterns were introduced.
- **Still open at this commit.** F2 and F3; both are addressed in 5983b75.

## Re-review of 5983b75

Commit 5983b75 ("docs: clarify fork defaults and deployment interruption recovery") changes only `docs/connect.md`, `docs/deploy.md` and `docs/organiser.md`, adding 4 lines. No implementation changed.

- **F2 resolved.** The teammate clone block now runs `gh repo set-default YOUR-OWNER/YOUR-FORK`.
- **F3 resolved by documentation.** deploy.md now says not to interrupt the deploy or disconnect its SSH session, and to ask the organiser before retrying. This is accurate: a dropped SSH session sends SIGHUP, which by default terminates Node without running the `catch` recovery. The helper itself still has no signal handling; that is an accepted limit, not a blocker.
- **Hello-unit info resolved.** organiser.md now asks the organiser to confirm the hello unit is named `team-hello.service`.
- **No leaks.** No new hosts, credentials or attribution were introduced.

## Verdict

**APPROVE** 5983b752622f3a50ef4a52e9f3782afd77802015. Its implementation is byte-identical to 1b9acd0b888affcdeee22184062faf9aff2862df, which was fully reviewed; the two later commits were reviewed as docs-only deltas.

What I verified:
- The Node 22 starter runs and its tests pass on a verified Node 22 binary.
- The server exposes only the intended assets.
- The deploy guards refuse unsafe states.
- The documented failure-recovery and release-preservation behaviour matches the real script in a sandboxed simulation.
- No credentials or private host details are committed.
- Participant fork, connection and role instructions are coherent.

F1 was resolved in 581526c. F2, F3 and the hello-unit note were resolved in 5983b75. No findings remain open.

Hosted readiness is not approved by this review. It depends on the organiser's fresh-team rehearsal in docs/organiser.md.
