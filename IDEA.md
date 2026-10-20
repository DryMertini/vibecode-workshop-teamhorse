# The idea

- **Assigned idea:** A running club posts a run with its route, pace and meeting time so others can join.
- **Who has the problem?** Club runners on their phone, before a run. One member knows the route, the pace and the meeting time, but that knowledge lives in a chat thread or in one person's head. A runner who is not in that thread cannot find out whether a run is happening, who is coming, or when to be at the bridge.
- **What can they do by the end of the demo?** Open the club board on a phone, read the upcoming runs (route, meet-at point, distance, pace, meeting time, who is in), post a new run, and tap **I'm in** — with an optional name — so the captain can see who to wait for.
- **What one task proves it helped?** A runner posts a run on a phone — "Riverside loop, Thursday 07:00, 5:30 /km" — a second visitor on another device sees it in the board and taps **I'm in** as "Sam"; the board shows Sam and the count; both facts survive a reload and a server restart.
- **What constraints matter today?**
  - **One person.** There is no teammate in this team. Independence comes from separate sessions, and the reviewer runs a different model family from the coder. The "someone else used it" evidence has to come from outside the team; see `PLAN.md`.
  - **No team hosting yet.** There is no assigned URL, no SSH handout and no guest on this machine, so the live release is not available. The journey is built and proven locally and stays deploy-ready; the public release waits for the organiser.
  - The deployment contract in `AGENTS.md` and `docs/deploy.md` stays intact: `scripts/`, `/api/health`, the committed lockfile, and `test/app.test.mjs` (we extend `server.mjs`, so we extend that test).
  - Zero runtime dependencies, no build step, no external services, no CDN assets or web fonts. The guest is small and its outbound requests to `*.intra.land` are blocked.
  - Durable data lives outside the release directories, under `~/.local/share/vibecode-workshop/data/`.
  - Only files under `public/` are web assets. The stored data must never be downloadable over HTTP.
  - The demo audience is one visitor on a phone: one page, no navigation, large touch targets.
- **What are we deliberately leaving for later?** Accounts and real authentication (a display name is not an account), recurring runs, maps, pace or distance filters, calendar export, reminders, private runs, run comments.
- **What remains an assumption that we need to test?**
  - A runner will **post** a run, not only browse one. The empty board must read as an invitation, not as a broken page.
  - Pace is free text such as `5:30 /km` and is never parsed. The team is betting that runners type their own pace rather than pick from categories we invented.
  - One optional name next to **I'm in** is enough identity for a club. A name is a display string, not a login: one join per device, no password, no account.
  - The meeting time is stored as a local wall-clock string with no timezone conversion. The club is in one timezone and reads the printed time as local.
  - One page is enough on a phone, and the board stays readable with a dozen runs on it, not just two.
  - "Join" has to be visible inside the app (a count and the names), not only implicit in showing up.

Acceptance in one sentence: *A runner posts a run on a phone, another visitor sees it and joins it by name, and both facts survive a reload and a server restart.*
