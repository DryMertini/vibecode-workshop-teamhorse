# M1.5 review

Base SHA: 2793a75 (run-board step, under separate review)
Head SHA: 6ab6725 (branch m1.5-landing-leaderboard)
Reviewer session/provider: claude-sonnet-5-5 (Anthropic). Coder was claude-opus-5-5, same provider family, different model. This is NOT the preferred cross-family independence; it is a different session that did not write the change.

## What I checked

Acceptance (derived from the human request + project contracts); worktree at 6ab6725, server on port 3012, scratch WORKSHOP_DATA_DIR.

- npm test: `ℹ tests 31 / pass 31 / fail 0`.
- Routes (curl): `/ 200 text/html`, `/run 200`, `/leaderboard 200`, `/leaderboard.js 200 text/javascript`, `/app.js 200`, `/style.css 200`, `/api/health 200 json`, `/api/board 200 json`. Not served: `/run.html 404`, `/leaderboard.html 404`, `/index.html 404`, `/server.mjs 404`, `/package.json 404`, `/.git/HEAD 404`. Allowlist in server.mjs gained only the three new entries, all files under public/. /api/health untouched.
- Landing: `nav.big-buttons` links `RUN->/run`, `LEADERBOARD->/leaderboard`. Clicking RUN in Chrome lands on `/run runs=3 form=true`.
- Board still works at /run: posted a run through the form (runs 3 -> 4), tapped I'm in (`button.joined` count 1). No regression from moving the board.
- Leaderboard stats vs curl data: posted 3 runs (distances 8.25 [server stores 8.3], 5, 5; one past) and 2 joins on one run. Direct computation from /api/board gave `3 2 2 18.3`; page showed Runs posted 3, Coming up 2, I'm ins 2, Km planned 18.3. After the UI post+join: page `4,3,3,21.3`, correct. Empty state: "The track is empty." table row, with no data.
- Animation: computed transforms sampled at ~130ms/90ms steps changed (e.g. gallop translateY -6.56 -> -8.61 -> -2.86; leg matrices differ); 14 running animations. With prefers-reduced-motion emulated: 0 running animations, transforms `none`.
- Chrome measurements (scrollWidth == viewport, wide elements [], console errors []): / , /run, /leaderboard at 375x812 and 1440x1000, all clean. Screenshots: scratchpad shot-{m,d}-{home,run,leaderboard}.png. Horse reads clearly as a galloping horse (body, neck, head, ears, mane, tail, four jointed legs, ground dashes, speed lines); on 375 it is full width and the two buttons stack, with RUN filled and LEADERBOARD outlined. Leaderboard shows four stat tiles on top (2x2 on phone) and the empty rankings.
- No CDN/web fonts/outbound HTTP/dependencies: grep of diff shows only same-origin /style.css, /leaderboard.js, /app.js, /api/board; system font stacks.

## Findings

1. Low - public/leaderboard.js: fetches `/api/board` without the `?now=` param app.js sends, so "Coming up" uses server local time, whereas /run uses the viewer's clock. Near a run's start time (or with a different server timezone, e.g. hosted guest in UTC) the two pages can disagree by a few hours on upcoming vs started. Suggested: pass `?now=` like app.js. Not blocking.
2. Info - two headless screenshots taken ~seconds apart were byte-different but looked visually identical pose-wise; I therefore verified animation via computed styles instead of pixels. Not a defect.
3. Info - Rankings are a static empty state by design (request: "empty but waits to be filled"); nothing populates it yet. Stats are numbers shown as "—" until load, with an error message if the fetch fails (not exercised).

No blocking defects found.

## Not verified

Hosted/public HTTPS journey (not deployed); the leaderboard fetch-failure message path; real mobile device or Safari/Firefox (only headless Chrome); the `prefers-reduced-motion` check was emulated, not on a real OS setting; the base step 2793a75 itself was not reviewed here; independence limit (same provider family) as stated above. Screenshots could not demonstrate motion; animation evidence is computed-style sampling.

## Verdict

APPROVE for 6ab6725 (delta over 2793a75). All criteria met: working landing with large animated horse and two links, board intact at /run, leaderboard with correct live stats and empty rankings, reduced-motion respected, only public/ served, no console errors or overflow at 375 and 1440. Finding 1 is a recommended follow-up, not a blocker.
