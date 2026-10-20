# Session — 2026-10-20 project lead, running-club journey

> Superseded later the same day by `2026-10-20-project-lead-solo-team.md`, which changes the team size to one person, adds the optional name field and free-text pace, and merges M1.2 with M1.3 into one PR. Kept as history; follow the newer file.

## Decisions

Agreed with the human on 2026-10-20:

- Idea: a running club posts a run with route, pace and meeting time so others can join.
- "Join" happens in the app: tapping **I'm in** shows how many are coming. The team chose this over "join by turning up", knowing it adds a second write action.
- Persistence: shared between visitors and durable across a server restart, in a file outside the release directories.
- Hosting: none today. No team handout (key, port, URL) exists on this machine, so the live release is blocked on the organiser. The journey is proven locally and stays deploy-ready.
- Audience: one visitor on a phone.
- Framework: extend the starter's zero-dependency Node server. No build step, no new dependencies.

## Audit of the starting state

- `main` is `c3e2c39`, clean tree, tracking `origin/main` = `git@github.com:DryMertini/vibecode-workshop-teamhorse.git` (the team fork). `.ai/context.md` was stale: it said the M13.27 work was unreviewed and unmerged, but PR #1 merged it into `main`.
- The app is still the starter: a static page from `public/` plus `GET /api/health`. `server.mjs` answers 405 for any method other than GET/HEAD and serves only `/` and `/style.css` from a hard-coded map. That is a good base: no product code to unpick.
- `npm test` on this macOS laptop: **20 pass, 1 fail**. The failure is `deploy lock rejects a second holder and releases when the holder dies` — macOS has no `flock` binary, so `acquireDeployLock` throws "Cannot lock deploy because flock is missing". CI runs on `ubuntu-latest`, which has `flock`, so CI is green. Recorded as M1.1 work.
- `npm run doctor`: OK. `gh` (GitHub CLI) is **not installed** on this laptop, so the committer step needs a decision (install it or open PRs in the browser).
- The guest-side deploy guards (release pruning, 2G build cap, deploy lock) are already in `main`; the deploy contract in `AGENTS.md` and `docs/deploy.md` is the contract our M1 must not break.

## Handoff

State: `IDEA.md` and `PLAN.md` are rewritten with the agreed goal and the M1–M2 step list. No product code, no branch, no PR, no deploy. The working tree has only these documentation changes; they are uncommitted on `main`.

Next: the team names the human owner for M1 and opens a fresh milestone-lead session. That session audits, writes `.ai/work/M1.1/brief.md`, and runs coder → independent reviewer → committer for M1.1 only. Do not start M1.2 before M1.1 is merged.

Open items for the human: name the M1 human owner; decide how PRs are opened (install `gh` or use the browser); keep M1.5 (live release) on hold until the organiser provides hosting, and treat that as a release decision, not a step to force.
