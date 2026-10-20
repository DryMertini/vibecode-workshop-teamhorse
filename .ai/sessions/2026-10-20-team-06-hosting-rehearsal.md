# Session — 2026-10-20 team-06 hosting rehearsal and first deploy

## Decisions

- The organiser's hosting arrived: the handout key and pinned `known_hosts` for team-06, plus a
  public URL. The human asked to check the files and deploy.
- **The handout key was found inside the repository working tree.** It was copied to a directory
  outside the repository with mode `600`, and the in-repo copies were deleted. Nothing containing
  key material, a host address or a port was written to any file, and no credential was committed.
- **Deployed `main` at `c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645`** — the reviewed starting page.
  This is a *hosting rehearsal*, not the M1.4 release: the running-club board does not exist yet.
  The public URL therefore shows the starter page, and no hosted acceptance of the journey is claimed.
- The fork has **zero pull requests**; the earlier "PR #1" in the merge commit message belonged to
  the upstream starter. The M1.1 branch is pushed but unmerged, and only the human can open or merge
  a PR (no `gh` installed, no API token available to this session).
- The Linux half of M1.1's case N5 was proven **on the guest** at both revisions — 21/21 on real
  util-linux `flock` — because the fork's GitHub Actions are disabled and no `Check` run exists.

## What was run

- Guest diagnosis as `vc-team`: contract `user-app-v1`, placeholder unit intact, linger enabled,
  systemd 257.13 user manager live, `cgroup.subtree_control` = `cpu memory pids`, a 2G bounded scope
  starts (exit 0), util-linux `flock` 2.41.5 present, 3 GiB RAM, no swap, 306 GiB free disk.
- `git clone` of the team fork into `~/src/team`; `npm ci`; `npm test` on `main` (21/21) and on the
  M1.1 head `9aa24c3` (21/21); `npm run deploy:preview` (changed nothing); `npm run deploy`.
- Deploy output: `DEPLOYED c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645`, release kept at
  `~/.local/share/vibecode-workshop/releases/c3e2c3936c0c-TvfkDo`, `vc-app.service` active and
  enabled, `~/workshop` not modified, one release on disk.
- From the laptop: `https://team-06.intra.land` → HTTP 200 with a verified TLS chain;
  `/api/health` → `{"ok":true,"revision":"c3e2c39…"}`; page title `Your first live step · Vibecode
  workshop`; `npm run smoke -- https://team-06.intra.land` from a scratch clone of `main` → `OK`,
  exit 0.

## Handoff

State: the reviewed starting page is live. Evidence: `.ai/work/M1.4/hosting-rehearsal.md` (new),
`.ai/work/M1.1/{brief,validation,review,pr}.md` (M1.1 step evidence; `review.md` and `pr.md` are
still uncommitted in the working tree), `PLAN.md` and `.ai/context.md` updated for the hosting
status. No implementation file changed since the approved head `9aa24c3`.

Next: the human opens the M1.1 pull request in the fork from branch `m1.1-trustworthy-baseline`
and merges it after accepting it; then M1.2/M1.3 (the board) is briefed and built, with the
`.gitignore` line for `team-*.key` included in that step. The milestone lead for M1.2/M1.3 has not
been briefed yet.

Checks and limitations: the Linux test proof came from the guest, not from the fork's CI, which
remains disabled. No phone-browser inspection was run, because the deployed page is byte-identical
to the starter page already inspected at 1440×1000 and 375×812; a phone check of the built journey
is still required by M1.4. The key was pasted into a chat session before being moved out of the
repository; it was never committed, and teammates should use their own personal keys.
