# Shared working instructions

Read IDEA.md, PLAN.md, .ai/rules.md and the role brief for your assignment. Inspect the relevant code and Git state before proposing work. CLAUDE.md is a symlink to this file, not a second instruction source.

## Responsibility

- The human owns the goal, taste, scope changes and milestone release decisions.
- The project lead agrees the plan, assigns one milestone lead at a time and brings unresolved decisions to the human. Leads do not implement code.
- The milestone lead audits the current state, writes step briefs and coordinates coder → reviewer → committer. It does not implement or approve its own team's code.
- The coder implements one step on its branch and commits it. It reports checks it actually ran.
- The reviewer is a different session that did not write the change, preferably using a different model family. It reviews the committed diff, acceptance criteria and validation output; UI review includes the running page. It records reasoning and a verdict on disk.
- The committer confirms the reviewed SHA, merges an approved step into the team's main branch and records a handoff. Deployment needs the team's explicit milestone release instruction.

## Changes and evidence

1. State what must be true and the cases that must pass. Do not prescribe unverified algorithms.
2. One step = one branch = one reviewable PR. IDs such as M1.1 are permanent; append new IDs rather than renumber.
3. Start from current main. Use `m1.1-short-description` for a step branch. Preserve dirty work; never reset or delete someone else's files.
4. Only one writer changes a checkout at a time. A fresh reviewer may inspect it while the writer is idle. Use separate clones/worktrees for concurrent writing, and agree shared contracts before splitting work.
5. Save evidence under `.ai/work/M1.1/`: brief.md, validation.md, review.md. State reviewed base and head SHAs. Do not hide failures, skipped checks or missing browser verification.
6. REQUEST CHANGES returns to the coder; a new SHA requires re-review. APPROVE must explain what was checked. Self-approval is not an independent review.
7. Changes merge through a PR within the team's fork. Explicitly target that fork, not the workshop starter. Main is the team's reviewed demo source, not an automatic production deployment.
8. Keep secrets and private connection details out of commits. Do not copy credentials between teammates; use each person's authorised account/key. Do not add attribution trailers, session links or generated-by lines to commits or PRs.
9. Never delete app data, another team's files or hosting resources to repair your app. Diagnose and ask the organiser for platform failures.
10. Before ending a session, save a short handoff in `.ai/sessions/`, update `.ai/context.md`, and add a pitfall only when there is a new lesson.

## Authoritative homes

IDEA.md owns the problem. PLAN.md owns planned outcomes, step status and dependencies. `.ai/context.md` owns the current focus. Step evidence owns proof and review. Session files own decisions and handoff history. GitHub PR state owns whether a PR merged; link it rather than maintain a second board.

## Starter commands

- `npm ci` — install the locked dependencies (the starter has none).
- `npm test` — HTTP behaviour and deployment-contract tests.
- `npm start` — app on `0.0.0.0:3000` by default.
- `npm run doctor` — environment diagnosis.
- `npm run deploy:preview` — inspect the proposed service without changing it.
- `npm run deploy` — explicit release on the workshop container; see docs/deploy.md.
- `npm run smoke -- https://ASSIGNED-URL` — check the served revision.

Do not claim hosted acceptance from a local green test. After UI changes, inspect the browser at desktop and phone widths, exercise the user journey and record evidence. Test scope must match the risk; do not manufacture tests merely to obtain a green badge.
