# Project plan

Draft only. Agree the goal with your team before implementation. Replace the example steps with outcomes that fit your idea. Keep assigned IDs permanent.

## Goal

A named user can complete one useful journey at our team's live URL. See IDEA.md for the problem and constraints.

## Working model

Project lead → one milestone lead → one step at a time through coder → independent reviewer → committer. Each milestone has one lead session. Each step names a human owner and the real agent sessions used. The lead records blockers here; it does not invent an approval.

## M1 — First useful live journey

Milestone lead: assign a fresh session. Human owner: fill in. Release: only after the team accepts the journey.

| Step | Outcome | Depends on | Human owner | State / PR |
|---|---|---|---|---|
| M1.1 | Our fork runs at the assigned URL and reports its deployed revision | Team access | assign | draft |
| M1.2 | The user can complete the core action | M1.1 | assign | draft |
| M1.3 | The result survives the persistence boundary our idea requires | M1.2 | assign | draft |
| M1.4 | A teammate can complete the whole journey; observed failures are corrected | M1.3 | assign | draft |

### M1.1 — The live starting point

- [ ] Every teammate has access to the same team fork.
- [ ] The assigned SSH connection reaches our team environment.
- [ ] Our page is reachable at the assigned HTTPS URL.
- [ ] `/api/health` reports the revision we intended to deploy.
- [ ] Another teammate opens the page on a phone.

### M1.2 — Core action

Write acceptance cases for the assigned idea: normal input, empty state and one failure. State the expected result rather than the implementation.

### M1.3 — Persistence

Specify what must survive: reload, another visitor, process restart, or all three. Choose deliberately; browser storage is not shared server storage.

### M1.4 — Feedback

Record one observed user problem, the resulting acceptance criterion and the result after correction. Add new scope as a new step instead of hiding it inside a fix.

## M2 — Improve the demonstrated journey

Plan only after M1 gives you evidence. Add the next useful milestone or stop and prepare the demo.
