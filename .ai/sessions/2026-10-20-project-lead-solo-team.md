# Session — 2026-10-20 project lead, solo team for the running-club journey

## Decisions

Agreed with the human on 2026-10-20:

- Idea: a running club posts a run with route, pace and meeting time so others can join.
- "Join" happens in the app: tapping **I'm in**. The human chose this over "join by turning up", knowing it adds a second write action.
- **Names:** one optional display name next to **I'm in**. No account, no login. The captain wants to know who to wait for, so an anonymous device count is not enough.
- **Pace:** free text such as `5:30 /km`, never parsed. The earlier Easy/Moderate/Fast buckets were rejected as a taxonomy the club does not use.
- Persistence: shared between visitors and durable across a server restart, in a file outside the release directories.
- Hosting: none today. No team handout (key, port, URL) exists on this machine, so the live release is blocked on the organiser. The journey is proven locally and stays deploy-ready.
- Audience: one visitor on a phone.
- Framework: extend the starter's zero-dependency Node server. No build step, no new dependencies.
- **Team size: one person.** Every role is a separate agent session run by the same human; independence comes from the session boundary and a different model family for the reviewer.
- M1.2 and M1.3 ship as one branch, one PR and one review. This is a deliberate deviation from "one step = one branch = one PR", recorded in `PLAN.md` with the reason.

## Roast that produced these changes

The premise was challenged out loud: a running club already has WhatsApp, so the product is only worth building if it beats the chat on a rolling board and a headcount. The anonymous count was called theatre; the pace buckets were called an invention of ours; "one visitor" was called a demo constraint that should not become the design target; and a five-step plan with four handovers per step was called impossible for two people, let alone one. The name field and the free-text pace came out of that.

## Audit of the starting state

- `main` is `c3e2c39`, clean tree before this session's doc edits, tracking `origin/main` = `git@github.com:DryMertini/vibecode-workshop-teamhorse.git` (the team fork). `.ai/context.md` was stale: it said the M13.27 deploy-guard work was unreviewed and unmerged, but PR #1 merged it into `main`.
- The app is still the starter: a static page from `public/` plus `GET /api/health`. `server.mjs` answers 405 for any method other than GET/HEAD and serves only `/` and `/style.css` from a hard-coded map. A good base: no product code to unpick.
- `npm test` on this macOS laptop: **20 pass, 1 fail**. The failure is `deploy lock rejects a second holder and releases when the holder dies` — macOS has no `flock` binary, so `acquireDeployLock` throws "Cannot lock deploy because flock is missing". CI runs on `ubuntu-latest`, which has `flock`, so CI is green. Scheduled as M1.1.
- `npm run doctor`: OK. `gh` (GitHub CLI) is **not installed** on this laptop, so the committer step needs a decision (install it or open PRs in the browser).
- Model families available in the local OpenCode install include `anthropic/*`, `openai/*`, `google/*`, `deepseek/*`, `moonshotai/*` and others, and this machine also has Claude Code and Codex CLIs. S3 and S4 should use different families; `review.md` must record which.
- The guest-side deploy guards (release pruning, 2G build cap, deploy lock) are already in `main`; the deploy contract in `AGENTS.md` and `docs/deploy.md` is the contract M1 must not break.

## Dispatch capability, verified 2026-10-20

The human asked whether the lead can open the other agent sessions itself. It can: child sessions get a fresh context, a pinnable model family, and full tool access in this checkout. Probes, with failures kept visible:

- `anthropic/claude-sonnet-5.5` — **failed**: "Key limit exceeded (total limit), $0.00 of $0.00 used; does not reset" (OpenRouter key).
- `google/gemma-4-26b-a4b-it:free` — **failed**: provider returned error.
- `cohere/north-mini-code:free` — **passed**: ran `git rev-parse`, `node --version`, read `IDEA.md`, wrote `.ai/private/probe.md`, read it back.
- `xingchen-agi/xing4.0-29b-a4b:free` — **failed**: provider returned error.

Two of the three probed free families failed with provider errors, so the free tier on this key is unreliable. The working set is therefore `cohere/north-mini-code:free` and the minimax family.

Consequences for the plan's independence compensation:

- Paid families (anthropic, openai, google) are unavailable to child sessions. The "different model family" split is satisfied with **free families only**: S3 coder on `cohere/north-mini-code:free`, S4 reviewer on the minimax family. They differ from each other, which is what the rule asks: the reviewer must not share a model with the writer. The reviewer session still gets no narrative from the dispatcher, so the writer's intent reaches it only through the committed diff.
- Both are small free models. The strong review is one the **human** runs in Claude Code or Codex with their own subscription, against the committed SHA. Free child sessions cover briefs, implementation, validation and merge mechanics.
- `gh` is still missing, so no session can open a pull request. The human opens it in the browser.
- S2 (milestone lead for M1.1) was dispatched as a child session on the minimax family: session `ses_ea6972782ffehhQJ9YWOGGM2ml`, prompt constrained to write only `.ai/work/M1.1/brief.md`.

## Handoff

State: `IDEA.md` and `PLAN.md` are rewritten with the agreed goal, the solo-team session protocol, the M1.1–M1.4 step list and the scope cut order. No product code, no branch, no PR, no deploy. The only changes in the working tree are documentation: `IDEA.md`, `PLAN.md`, `.ai/context.md`, `.ai/rules.md`, `.ai/pitfalls.md` and this file.

Next: the human opens **S2, a fresh milestone-lead session**, in this checkout. S2 audits, writes `.ai/work/M1.1/brief.md`, and dispatches S3 (coder) → S4 (reviewer, different model family) → S5 (committer) for M1.1 only. M1.2/M1.3 follow as one PR after M1.1 is merged. No milestone lead, coder, reviewer or committer session has run yet, and nothing is claimed on their behalf.

Open items for the human: how PRs are opened (`gh` or the browser); the organiser's team handout, without which M1.4 and the public URL stay blocked; and any reversal of the name field or "I'm in" scope, which the plan records as the last two items in the cut order.
