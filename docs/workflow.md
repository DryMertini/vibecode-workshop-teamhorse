# One idea, one milestone, one reviewed step

## Before code

Agree IDEA.md. Let the project lead challenge it and draft PLAN.md. Give M1 to a milestone lead. That lead audits the actual code and writes `.ai/work/M1.1/brief.md` from the template. Record outcomes and cases, not a guessed algorithm. Record a design reference before UI implementation.

Run one step at a time initially. If teammates later work in parallel, use separate clones/worktrees and agree shared data/API contracts and integration order. Owning different files does not guarantee compatible work.

## Coder

Fresh session prompt:

> Read AGENTS.md, .ai/roles/coder.md and .ai/work/M1.1/brief.md. Implement only this step. Preserve existing work. Commit the change, run the required checks and save actual results to .ai/work/M1.1/validation.md. Report the exact base/head SHA. Do not merge or approve your own work.

The coder branches from updated main, for example `m1.1-live-page`. It commits implementation and validation evidence. Keep it idle during review.

## Reviewer

A separate session/provider that did not write the code receives:

> Read AGENTS.md, .ai/roles/reviewer.md and .ai/work/M1.1/brief.md. Review committed HEAD against the brief's base SHA and inspect .ai/work/M1.1/validation.md. Independently check the acceptance cases, including the browser for UI changes. Save .ai/work/M1.1/review.md with exact reviewed SHAs, findings, checks and APPROVE or REQUEST CHANGES. Do not implement fixes or merge.

An agent calling itself a reviewer after writing the code is not independent. Prefer a different model family where available. Any implementation change after approval needs review again. A report-only commit can preserve the report if it changes no implementation; explicitly verify that fact.

## Committer and partner

Use a third fresh session with .ai/roles/committer.md. It verifies the diff matches the approved implementation, commits only the report if needed and opens a PR **inside the team fork**. Explicitly supply the fork so GitHub CLI cannot choose upstream:

```sh
git push -u origin m1.1-live-page
gh pr create --repo YOUR-OWNER/YOUR-FORK --base main --head m1.1-live-page --title 'M1.1 — live page' --body-file .ai/work/M1.1/pr.md
```

The committer writes pr.md from the PR template first. The partner checks: does it meet the outcome, did it change unrelated work, and does the running UI work? After the partner accepts and CI passes, the committer merges the approved PR. Branch protection is not assumed; these checks are still the team's responsibility.

Only the committer integrates. It records the PR and status in PLAN.md, updates .ai/context.md and writes a handoff in .ai/sessions/. Failed checks remain visible; no approval is inferred from silence.

## Milestone release

The team accepts the whole journey and explicitly says to release. Follow [deployment](deploy.md) from the team container. Initial M1.1 is an explicitly agreed early release of the starting page, so hosting problems surface before features.

Main does not auto-deploy. Deploying an archived commit keeps later development branch edits from changing the live app. Verify the revision, open the actual URL on another device and record what happened. Then observe a user and use [feedback](feedback.md) to choose the next step.
