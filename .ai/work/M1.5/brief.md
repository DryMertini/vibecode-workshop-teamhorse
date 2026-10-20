# M1.5 — Landing page, running horse, empty leaderboard

New scope from the human on 2026-10-20, appended as a new step (not hidden inside M1.2). No milestone-lead brief was written; the request itself is the brief:

> "do a landing page like where the person lands as he first opens the site, and do 2 clickable buttons that one says RUN other says LEADERBOARD and a large graphic horse that is running at its place. RUN button goes to whatever we have right now and the leaderboard is empty but waits to be filled, has stats on top and stuff."

Acceptance used by the reviewer:
- `/` is a landing page with a large horse animated running in place and two buttons, RUN → `/run` (the M1.2 board, unchanged behaviour) and LEADERBOARD → `/leaderboard`.
- The leaderboard shows club stats on top computed from `/api/board`, and an empty rankings state. No ranking data source exists yet; what earns a rank is an open human decision.
- Reduced motion stops the animation. No overflow and no console errors at 375×812 and 1440×1000.
- Standing contracts hold: only `public/` served, `/api/health` unchanged, no dependencies, CDN, web fonts or outbound HTTP.

Coder: claude-opus-5-5. Base `2793a75`, head `6ab6725`. Checks the coder ran: `npm test` 31/31; headless Chrome measurement of `/` and `/leaderboard` at both widths (no overflow, no console errors) and screenshots inspected.
