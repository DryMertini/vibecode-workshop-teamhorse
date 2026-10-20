# Project plan

Agreed with the human on 2026-10-20. Outcomes and cases, not algorithms.
Step IDs are permanent: append, never renumber.

## Goal

A named user can complete one useful journey at our team's live URL.
For this team that is: **a runner posts a run on a phone, and another visitor sees it and joins it by name** — and both facts survive a reload and a server restart. See `IDEA.md`.

## Working model

**This team is one person.** Every role below is a *separate session* run by the same human, in order, on the same machine. Independence comes from the session boundary and from a different model family for the reviewer — not from a second human. Never describe a session as having run unless it actually ran.

| Session | Role | Model | Does |
|---|---|---|---|
| S1 | Project lead | any | Agree the goal, challenge the premise, own this plan. **Done 2026-10-20.** |
| S2 | Milestone lead | any | Audit the state, write `.ai/work/M1.x/brief.md`, dispatch, hold the IDEA.md line. Does not implement. |
| S3 | Coder | family A | Implement one step on its branch, commit it, write `validation.md` with the checks it actually ran. |
| S4 | Reviewer | **family B ≠ A** | Receives only the brief, the committed diff and `validation.md`. Re-runs the checks, opens the running page, writes `review.md` with APPROVE or REQUEST CHANGES. |
| S5 | Committer | any | Verify the head SHA equals the approved SHA, open the PR inside the fork, merge exactly that SHA, update `PLAN.md`, `.ai/context.md`, `.ai/sessions/`. |

Compensations for a one-person team, agreed in advance:

1. **Different family, recorded.** S4 runs a different model family from S3. `review.md` states provider and model for both. Do not claim a second provider ran if it did not.
2. **The reviewer gets no narrative.** Only `brief.md`, the committed diff and `validation.md`. Not the coder's chat, not its reasoning, not this plan's optimism.
3. **The reviewer re-runs, it does not read.** It states the commands it ran and their output. The coder's summary is a claim, not evidence.
4. **UI is verified by looking.** For UI changes the reviewer opens the running page itself at 375×812 and 1440×1000.
5. **"Someone else used it" is a known gap.** There is no second human in this team, so the cold-use evidence comes from S4, which did not write the code, and from the organiser or other teams trying the public URL. The gap is recorded, not papered over.
6. **One writer, one checkout.** S3 is the only session that changes files while it works. S4 inspects the committed branch and never edits it.

Decisions taken with the human on 2026-10-20 (the human owns goal, taste, scope and release):

| Decision | Choice |
|---|---|
| Idea | Running club: post a run with route, pace and meeting time so others can join |
| Meaning of "join" | In the app: tapping **I'm in** shows who is coming |
| Names | One **optional display name** next to **I'm in**. No account, no login. |
| Pace | Free text, e.g. `5:30 /km`. Never parsed, only displayed. |
| Persistence | Shared between visitors and survives a server restart (file outside the release directories) |
| Hosting | The assigned guest (team-06) is live. The reviewed **starting page** is deployed and serving; the product journey still needs M1.2/M1.3 |
| Demo audience | One visitor on a phone |
| Framework | Extend the starter's zero-dependency Node server. No Next.js, no Vite, no build step |
| Team size | One person, four agent sessions per step |

## M1 — A runner can post a run, and another runner can join it

Milestone lead: **the same human, in a fresh session S2**.
Human owner: the same human.
Release: only after the human accepts the journey. There is no hosting yet, so the live release is a separate decision (M1.5).

| Step | Outcome | Depends on | State / PR |
|---|---|---|---|
| M1.1 | The team can trust a local test run and the agreed plan is on disk | — | draft |
| M1.2 | A runner can post a run; the board shows it to every visitor and keeps it across a restart | M1.1 | draft, one PR with M1.3 |
| M1.3 | A runner can tap "I'm in" and the count and names are honest | M1.2 | draft |
| M1.4 | The journey runs at the assigned URL and a cold visitor completes it on a phone | M1.3 | hosting ready; journey not built |

**Deliberate deviation from "one step = one branch = one PR":** M1.2 and M1.3 ship as one branch, one PR and one review. A single person cannot afford four review cycles in a workshop, and the two halves of this product are one file format. Both ID sets are named in the brief and both are checked by the reviewer. The IDs keep their meanings.

### M1.1 — A baseline we can trust

No hosting exists yet, so the original "our fork runs at the assigned URL" step cannot be the first one. This step buys a trustworthy signal and a written plan instead. It changes no product behaviour.

- [ ] `npm test` is green on a macOS laptop and on Linux CI, with no test silently skipped.
- [ ] The deploy-lock case still asserts real lock behaviour wherever `flock` exists, and asserts the clear "flock is missing" guard error where it does not, instead of failing.
- [ ] `npm run doctor` reports OK and `npm run deploy:preview` prints the unit and changes nothing.
- [ ] `GET /api/health` still answers `{"ok": true, "revision": "..."}`.
- [ ] `IDEA.md` and this plan are the agreed versions, committed.
- [ ] The team has decided how PRs are opened: the GitHub CLI is not installed on this laptop — install it, or open pull requests in the browser.

### M1.2 and M1.3 — The board, and "I'm in"

Evidence for both lives in `.ai/work/M1.2/` (brief, validation, review). The brief must state the cases for both ID sets.

**Post a run (M1.2).**

- [ ] Normal: a runner fills route, meet-at point, distance (optional), pace and meeting time, submits, and the run appears on the board with those details.
- [ ] The form is usable on a phone: one page, no navigation, large targets, no horizontal scrolling, no browser console errors.
- [ ] Empty or failure: a blank route, a missing pace or a missing meeting time is refused with a message the runner can act on, and no run is created.
- [ ] Read-back: after a reload the run is still on the board, with the meeting time shown exactly as it was entered.
- [ ] The stored data file is not downloadable over HTTP, and no repository file or path outside `public/` is served.
- [ ] The behaviour is covered by the test suite, not only by hand.

**Shared and durable (M1.2).** What must survive is chosen deliberately: **all three** — a reload, a second visitor, and a server restart. Browser storage is not shared server storage, so the board is server state.

- [ ] A run posted by one client is visible to a second, different client.
- [ ] The runs survive a restart of the server process, from durable storage outside the release directories (`~/.local/share/vibecode-workshop/data/`), and the storage location can be overridden for tests.
- [ ] A failed or interrupted write leaves the previous board readable; it does not corrupt or empty it.
- [ ] The board is ordered: upcoming runs first by meeting time, and runs whose time has passed are separated, not mixed in.
- [ ] The board stays readable with a dozen runs on it, not only two.
- [ ] With no runs, the board shows a deliberate empty state that invites the first post, and one line states what the club is and when it runs.
- [ ] The meeting time is stored and displayed as a local wall-clock time, never converted between timezones.

**"I'm in" (M1.3).**

- [ ] A runner taps **I'm in**, optionally types a name, and the board immediately shows that name and the count.
- [ ] The same device tapping again does not increase the count, and the board shows that this device is already in.
- [ ] A second device tapping the same run increases the count independently.
- [ ] A join without a name is still counted, and the board says what the number means.
- [ ] The count and the names survive a reload and a server restart.
- [ ] A name is a display string, not an account: one join per device, no password, no login, no email.

### M1.4 — Live and observed

Blocked on the organiser providing the assigned SSH details and public URL. Until then the journey can be run locally at phone width, but no one may claim hosted acceptance.

> **Hosting rehearsal, 2026-10-20.** The organiser's details arrived and the assigned guest was
> diagnosed, tested and deployed: the reviewed **starting page** (`c3e2c39`) is live and serving at
> the team's public URL, and the public HTTPS route, the drop-in switch, the local health check and
> the guest's Linux test run are all proven. **The product is not live** — the public URL shows the
> starter page until M1.2 and M1.3 land. Evidence: `.ai/work/M1.4/hosting-rehearsal.md`.

- [ ] Every teammate has access to the same team fork and the assigned SSH connection reaches the team environment. (One person: this is the human's own access.)
- [ ] The page is reachable at the assigned HTTPS URL and `/api/health` reports the revision we intended to deploy.
- [ ] A cold visitor — the reviewer session S4, which did not write the code — completes the whole journey on a phone: post a run, second device joins it.
- [ ] The public URL is offered to the organiser and to other teams, because this team has no second human to try it.
- [ ] One observed user problem is recorded, turned into an acceptance criterion, and either fixed as a new step or explicitly deferred.

## M2 — Improve the demonstrated journey

Plan only after M1 gives evidence. Candidates, in no order: recurring runs, a map link for the route, pace and distance filters, calendar export, a "runs I am in" view, comments on a run, real accounts.

## Scope cut order if time collapses

Cut from the top of this list, never the core: **the distance field** → **the "started runs" section** → **the optional name** (only if the human reverses that decision) → **"I'm in" entirely** (only if the human reverses that decision). The core that must survive: *post a run, see it on another device, see it after a server restart.*

## Risks on the record

- **One person means the same human writes the brief and reads the code.** Mitigated by the session protocol above, not solved. The reviewer's value depends on running a different model family and on re-running the checks rather than trusting the summary.
- **Four agent sessions per step** is a lot of ceremony for a workshop. S2 writes a short brief, S5 does the mechanical merge work, and the plan's M1.2/M1.3 merge is the main time saver.
- **Hosting is live, the product is not.** The assigned guest serves the reviewed starting page at the team's public URL, and the whole deploy path is proven. The running-club board still needs M1.2/M1.3, and the live URL shows the starter page until then. Do not let a working deployment be mistaken for a finished journey.
- **The fork has no pull requests and no CI.** The M1.1 branch is pushed but unmerged, GitHub Actions are disabled on the fork, and no session here can open or merge a PR (no `gh`, no API token). The Linux proof came from the guest instead. Both are human actions.
- **The starter's own test suite is red on macOS** (`flock` is a Linux tool). M1.1 fixes it; until then, a local red run means "this laptop", not "the change is broken".
- **Timezones are a latent bug we have chosen not to fix.** Meeting times are naive local strings. A later step must not "correct" this into a conversion.
