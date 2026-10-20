# M1.2 / M1.3 validation (coder session)

Coder: Claude Code, `claude-opus-5-5` (anthropic family). The reviewer must be a different session, preferably a different family.
Base: `1ac17ea` (M1.1 head, approved at `9aa24c3` plus docs-only commits). **Deviation from the brief:** the brief said to branch from `main` at `c3e2c39`; on that base `npm test` is red on macOS (20/1) and IDEA/PLAN are blank templates, so this branch is stacked on the M1.1 branch. Merge M1.1 first.

## What changed
- `server.mjs` — extended (not replaced). `GET /api/board`, `POST /api/runs`, `POST /api/join`; `createApp({ revision, dataDir, now })`. Data in `board.json` under `WORKSHOP_DATA_DIR` (a directory), default `~/.local/share/vibecode-workshop/data/`, created recursively. Writes are serialized, written to a temp file, fsynced and renamed into place; memory only changes after the rename. A corrupt file returns 500 and is never overwritten.
- Device identity: the `x-device-id` header (or `device` in the join body). Device tokens are never returned to clients; the board returns `count`, `names`, `unnamed`, `joined`.
- Past/upcoming: compared as strings against the page's own local wall clock (`?now=YYYY-MM-DDTHH:MM`), falling back to the server's local clock. Stored values are never rewritten.
- `public/app.js` — separate client script, served as `text/javascript`. Meeting time display reformats the string's own fields (weekday by integer arithmetic); no `Date` is built from a meeting time.
- `public/index.html`, `public/style.css` — board, empty state, club line, form, single optional name field shared by every I'm in button.
- `.gitignore` — `team-*.key`, `team-*.known_hosts`.
- `test/app.test.mjs` — fixture uses a temp data dir; 9 new cases.
- Placeholder taste: the club line ("Teamhorse Run Club … Tuesday and Thursday 07:00 … Sunday long run") is invented and needs the human's wording.
- Extra validation beyond the brief: meet-at is required (the brief's outcome lists it as required); distance must be 0.1–200 km; bodies over 8 KB, non-JSON, and invalid dates such as 2030-02-30 are refused.

## Checks actually run (macOS, Node 25)
- `npm test` → tests 30, pass 30, fail 0, skipped 0.
- Local server `PORT=3001 WORKSHOP_DATA_DIR=<scratch>`; 12 runs posted with curl → 12 × 201; `board.json` created.
- Headless Chrome via DevTools protocol, mobile emulation 375×812 and desktop 1440×1000: `scrollWidth == clientWidth` (375, 1440), no element past the right edge, 12 `.run` cards, 0 console errors (after adding an inline favicon; before that, `/favicon.ico` 404 was logged).

## Not done
- No human hand test yet of posting/joining in a real browser; no two-device test by hand (covered by HTTP tests with two device ids).
- F4 (kill mid-write) is covered by design (temp + rename) and by the corrupt-file test, not by killing a process mid-write.
- Not deployed. No independent review yet.
