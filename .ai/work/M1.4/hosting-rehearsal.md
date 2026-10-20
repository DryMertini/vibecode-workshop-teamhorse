# M1.4 — Hosting rehearsal (2026-10-20)

**This is a rehearsal of the hosting path, not the M1.4 release.** M1.4's own brief has not been
written yet, and the running-club board does not exist. What is deployed is the reviewed **starting
page** (`main` at `c3e2c39`), so that SSH, the user unit, the memory-bounded scope, the release
switch, the local health check and the public HTTPS route are proven before the product exists.
The public URL currently shows the starter page, not the product. Nothing here claims the M1.4
acceptance criteria.

## Credentials

The handout private key (`team-06.key`) and pinned `known_hosts` were supplied for this step. The
key was initially found **inside the repository working tree**; it was moved to a directory outside
the repository with mode `600`, and the in-repo copies were removed. The key fingerprint is
`SHA256:dNGvPtRzpC58Sda/LEV5R568AeI/X/r5Sr5SmUXPGSw` (ED25519, comment `vc-team-06`). No key
material, host address, port or credential is committed anywhere, and none appears in this file.

**Recommendation for the next step:** add `team-*.key` and `team-*.known_hosts` to `.gitignore`, so a
handout file dropped in the repository root can never be swept into a commit by `git add -A`.

## Guest diagnosis (all commands run on the assigned guest as `vc-team`)

| Check | Result |
|---|---|
| Identity | `vc-team` (uid 1000), no sudo |
| Host | Linux 6.12.100+deb13-cloud-amd64, Debian 13, x86_64, 2 CPUs |
| Toolchain | node v24.22.0, npm 11.19.1, git 2.47.3, util-linux `flock` 2.41.5 at `/usr/bin/flock` |
| Contract | `/etc/vc-guest-contract` = `user-app-v1` |
| Placeholder unit | `/etc/systemd/user/vc-app.service` is the workshop placeholder (`WorkingDirectory=%h/workshop`, `ExecStart=%h/workshop/start`, `Environment=PORT=3000`) |
| Linger | `/var/lib/systemd/linger/vc-team` present — the service outlives SSH |
| User manager | systemd 257.13 reachable; `vc-app.service` active and enabled before the deploy |
| Resources | 3 GiB RAM, 0 swap, 306 GiB free disk |
| Memory delegation | `cgroup.subtree_control` = `cpu memory pids`; `systemd-run --user --scope -p MemoryMax=2G -p MemorySwapMax=0 -- /bin/true` exits 0 |
| Placeholder before deploy | served its own HTML on port 3000 |

Every guard in `scripts/deploy.mjs` was satisfied, so the deploy was not blocked by the environment.

## Test runs on real Linux (independent of the laptop)

Both revisions were installed and tested **on the guest**, where util-linux `flock` exists, so the
`flock`-present branch of the deploy-lock case really executed.

| Revision | Result |
|---|---|
| `c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645` (`main`) | `tests 21 / pass 21 / fail 0 / skipped 0 / todo 0` |
| `9aa24c32f5dcb04fd40d5610186046498929dde5` (M1.1 head) | `tests 21 / pass 21 / fail 0 / skipped 0 / todo 0` |

This is the Linux half of M1.1's case **N5**, proven on the actual deployment target with the real
`flock` binary, not an emulation. The fork's own GitHub Actions remain disabled, so no `Check` run
exists for either SHA; the Linux proof here is independent of the fork's CI.

## The deploy

```
git clone https://github.com/DryMertini/vibecode-workshop-teamhorse.git ~/src/team
cd ~/src/team && git switch main && git pull --ff-only origin main
npm ci && npm test && npm run deploy:preview && npm run deploy
```

`npm run deploy:preview` printed the drop-in and changed nothing. `npm run deploy` re-ran the
suite (21/21), took the deploy lock, archived the commit, installed inside the 2G memory-bounded
scope, wrote the drop-in, restarted `vc-app.service` and confirmed the revision over the health
endpoint:

```
DEPLOYED c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645
Release kept at /home/vc-team/.local/share/vibecode-workshop/releases/c3e2c3936c0c-TvfkDo
No older releases to remove.
User service vc-app.service is active. ~/workshop was not modified.
```

After the deploy:

- `systemctl --user is-active vc-app.service` → `active`; `is-enabled` → `enabled`.
- The drop-in points `WorkingDirectory` at the release and sets `APP_REVISION` and
  `WORKSHOP_GIT_SHA` to the deployed revision.
- `~/workshop` is unchanged (the placeholder files keep their original timestamps).
- `~/.local/share/vibecode-workshop/releases/` holds exactly one release.

## Public verification from the laptop

| Check | Result |
|---|---|
| `GET https://team-06.intra.land/` | HTTP 200, TLS verified |
| `GET https://team-06.intra.land/api/health` | `{"ok":true,"revision":"c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645"}` |
| Page title | `Your first live step · Vibecode workshop` — the starter page |
| `npm run smoke -- https://team-06.intra.land` (from a clean clone of `main`) | `OK  https://team-06.intra.land serves revision c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645`, exit 0 |

The smoke check ran from a scratch clone at `main` because it compares the served revision against
the local `git rev-parse HEAD`; the repository's own checkout is on the M1.1 branch.

## Not proven / limits

- **The product is not live.** The deployed app is the unmodified starter page. The running-club
  board needs M1.2 and M1.3 first; nothing here is hosted acceptance of the journey.
- **No pull request exists in the fork.** The fork has zero pull requests; the M1.1 branch is pushed
  but unreviewed-and-merged. A PR must be opened by the human (the GitHub CLI is not installed, and
  no API token is available to this session).
- **No `Check` run exists.** The fork's GitHub Actions are still disabled, so the Linux proof comes
  from the guest, not from CI.
- **No phone-browser inspection.** The deployed page is byte-identical to the starter page that was
  already inspected at 1440×1000 and 375×812 in `.ai/validation/starter.md`; no UI changed, so no
  new browser check was run. A phone check on the *built* journey is still required by M1.4.
- **The key was pasted into a chat session** before being moved out of the repository. It was never
  committed. If the organiser rotates it, the replacement goes in the same out-of-repository
  location, and teammates should add their own personal keys to `~/.ssh/authorized_keys` rather
  than sharing this one.
