# M1.2 / M1.3 review

Base SHA: 1ac17ea525e143addf5c7b8662895b1ada5363ca (M1.1 head; brief's c3e2c39 base deviation explained in validation.md and accepted: M1.1 not merged, tests red on macOS at c3e2c39)
Head SHA: 2793a75 (branch m1.2-m1.3-board)
Reviewer session/provider: Claude Sonnet 5.5 (claude-sonnet-5-5), Anthropic. Coder was claude-opus-5-5, also Anthropic. Different model, SAME provider family: independence is weaker than the brief asks for. Review was done from a detached worktree; the repo checkout was not touched.

## What I checked (commands run, literal output excerpts)

- `npm test` in detached worktree at 2793a75: `tests 30 / pass 30 / fail 0 / skipped 0`.
- Server on port 3011, WORKSHOP_DATA_DIR in scratch dir:
  - Empty board `{"upcoming":[],"past":[]}`.
  - N1/N2/N3: POST /api/runs -> 201 with meetingTime "2030-10-22T07:00" stored and returned unchanged; read from another device id returns the same run.
  - F1/F2/F3: blank route -> 400 `Add the route, for example "Riverside loop".`; blank pace -> 400 `Add the pace...`; missing meetingTime -> 400 `Pick the meeting date and time.`; no run created (board count stayed 2 after the refusals/accepts shown).
  - Non-string fields: `route:{}` -> 400; `pace:["x"]` -> 400; `distance:{"a":1}` -> 400; `distance:[]` -> accepted as empty distance (201, harmless); body `null`, `[]`, `notjson` -> 400; 20 KB body -> 413; no JSON content-type -> 415. No crash; /api/health 200 afterwards.
  - N10-N13/N15: device alpha joins named "Sam" -> count 1; alpha again with name "Other" -> `alreadyIn:true`, count stays 1, name unchanged; device beta nameless -> count 2, names ["Sam"], unnamed 1; no-device join -> 400; bad runId -> 404; `name:{}` -> counted as nameless. Response contains only count/names/unnamed/joined; device tokens never appear (grep of board response for the device id: 0 hits).
  - N4/N14: killed and restarted the server; board returned identical runs, counts and names.
  - N5/B3: data went to `$WORKSHOP_DATA_DIR/board.json`, mode 0600, outside public/.
  - F4: temp file + fsync + rename in source (server.mjs save()); stale tmp files cleaned on error; only `board.json` present in the dir after 30 concurrent posts. I did not kill a process mid-write.
  - Concurrency: 30 parallel POST /api/runs -> board.json held 32 runs (30 + 2 earlier), valid JSON; 20 parallel joins from 20 devices -> count exactly 20.
  - Corrupt board.json (`{bad`): GET and POST both 500 with "Nothing was changed", file left as `{bad` (not overwritten), health still 200, server up.
  - F5/B2: /data, /board.json, /AGENTS.md, /package.json, /public/../server.mjs, /%2e%2e/.env, /..%2f..%2fserver.mjs, /public/app.js, //etc/passwd -> all 404. PUT/DELETE/PATCH on /, /api/board, /api/runs, /api/join, /api/health -> 405. GET /api/runs -> 405. /app.js served as `text/javascript; charset=utf-8`, with nosniff.
  - B1: package.json/scripts/ not in the diff stat (diff touches only brief/validation, .gitignore, public/*, server.mjs, test/app.test.mjs); health unchanged. B4: `.gitignore` diff adds team-*.key and team-*.known_hosts.
  - B5: `grep -nE "new Date|toISOString|getTimezoneOffset|toLocale|Date.parse"` on server.mjs and public/app.js: only `localNow()` (builds a "now" string from getFullYear/getMonth/... for comparison) in both files, and createdAt/joinedAt metadata via toISOString on the server (not meeting time). No Date is built from a meetingTime. Meeting time is compared lexicographically against local-now string and displayed by regex field reformatting (weekday via integer arithmetic; verified Wed 5 Mar 2031 correct). Meets B5.
- Browser (headless Chrome, DevTools protocol, own driver on port 9444, 12 runs incl. 2 in the past, long route names):
  - 375x812: scrollWidth 375 == viewport 375, no element past the right edge, 10 upcoming + 2 past cards, min button height 48px. Screenshot inspected: one page, readable, large I'm in button.
  - 1440x1000: scrollWidth 1440, no overflow, 11 upcoming + 2 past, 0 console errors. Screenshot inspected.
  - Driven via Runtime.evaluate at 375: submitting the empty form showed `Add the route...`; filling the form and submitting added "Wed 5 Mar · 06:45 / Browser test loop / Meet at Clock tower / 5 km · easy 6:00"; typing a name and clicking I'm in showed "1 going: Browser Bob" and button "You're in ✓" (disabled); after Page.reload the card still showed the join. Only console error was the 400 from my own intentional empty submit (browser logs failed fetches); otherwise none.

## Findings

1. LOW (UX) public/app.js `join()` and the submit handler set `#board-message` ("Run posted..." / "You're in..." / "This device is already in...") and then `await load()`, which immediately sets the message to ''. Observed in browser: message empty after post and after join. The result is still visible (card appears, button turns to "You're in ✓"), so N10/N11 hold, but the success/"already in" text the code intends never shows. Suggest: set message after load().
2. LOW server.mjs validateRun: `text(meetingTime, 16)` truncates before validation, so "2030-10-22T07:00Z" or "...07:00+05:00" is silently accepted as 07:00 (observed 201). Not reachable from the datetime-local UI; no stored-value corruption, but a suffixed value is silently reinterpreted. Suggest validating the untruncated string.
3. LOW No year is shown in the date ("Fri 10 Jan"), so a run posted for next year is indistinguishable by date alone. Brief permits this ("Thu 22 Oct · 07:00").
4. INFO The brief said /run, but the page is served at `/`; /run is 404. The brief's outcome/acceptance never requires a /run path.
5. INFO The explanation of what a nameless count means appears as "N without a name" in the going line; the longer explanation is only a title tooltip. Acceptable for N13.
6. INFO Server accepts joins on runs that already started (UI hides the button); harmless.
7. INFO club line is placeholder wording per validation.md; needs human taste decision. Same-provider independence limit above.

No defect against N1-N15, F1-F5, B1-B5, U1-U4 as far as exercised. No security issue found: data not served, tokens never returned, input bounded, writes serialised and atomic.

## Not verified
- Empty-state (no runs) rendering in a real browser (checked only that the API returns empty lists and the HTML contains the hidden empty block with the invitation and club line).
- True kill-mid-write (F4) and a second real browser profile (U3 simulated with distinct x-device-id headers via curl and a single browser profile).
- Real touch input on a phone; mobile viewport was emulated.
- Hosted/deployed behaviour (out of scope; not deployed).
- Past/upcoming split with a real clock boundary: observed 2 runs dated 2020 in the past section; boundary minute not tested.

## Verdict

APPROVE for head SHA 2793a75. Findings 1 and 2 are low severity and may be fixed in a follow-up; they do not violate an acceptance case. Approval covers only this SHA and is based on local behaviour plus emulated browser checks; it is not hosted acceptance.
