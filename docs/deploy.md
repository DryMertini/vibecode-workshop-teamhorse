# Deploy the team's demo

Do this inside the assigned interactive team SSH shell from [connect.md](connect.md). The helper expects Linux, a systemd user manager and user `vc-team` on your team's guest. It does not use sudo. It must not be run on the platform host or a laptop. `npm run deploy:preview` is the command you can run anywhere; it changes nothing.

The guest already runs a placeholder with the user service `vc-app.service` from `~/workshop`. That directory stays as the image created it. Clone the team fork to `~/src/team`.

## First deployment

Release only a reviewed main revision accepted by your team:

```sh
cd ~/src/team
git status --short
git switch main
git pull --ff-only origin main
npm ci
npm test
npm run deploy:preview
npm run deploy
```

If Git is dirty, preserve and commit the appropriate work on its branch before switching. Do not use a reset to make deployment proceed.

Let deployment finish; do not interrupt it with Ctrl-C or disconnect its SSH session. Signal interruption can bypass automatic recovery. If interrupted, ask the organiser to inspect `vc-app` and restore the previous release or the placeholder before retrying.

The helper checks that this machine is the assigned guest (`vc-team`, contract `user-app-v1`, the placeholder user unit, and user lingering). It checks main and a clean checkout, runs tests, archives that commit into a new release directory, installs dependencies and runs an optional build. It then installs a user drop-in for `vc-app.service` pointing at that release and restarts the user service. It does not rewrite `~/workshop`, earlier releases or application data. It checks the local health endpoint and intended revision. If startup fails, it restores the previous drop-in, or removes the drop-in so the placeholder serves again, and reports any recovery failure. Releases are retained; the helper never prunes them.

The user manager keeps running after you disconnect because lingering is enabled. Disconnect only after the command has finished.

```sh
curl --fail http://127.0.0.1:3000/api/health
npm run smoke -- https://YOUR-ASSIGNED-URL
```

Open the assigned URL in a browser and ask a teammate to try it on a phone. A local health check does not prove DNS, the tunnel, TLS or the user journey.

## Later deployment

Use the same commands after the team's next milestone release. No automatic GitHub deployment is installed. The script snapshots the checked-out commit; it does not fetch by itself, so confirm the revision before running it. A later deploy restarts `vc-app.service` onto the new release after that release passes its health check. The previous release directory remains on disk.

```sh
vc-app status
vc-app logs
```

Those commands are the guest's status and log interface for `vc-app.service`. The same information is available directly:

```sh
systemctl --user status vc-app.service --no-pager
journalctl --user -u vc-app.service -n 80 --no-pager
```

If you use local `npm start` in the guest while the service is running, port 3000 will already be in use. On your laptop, use `PORT=3001 npm start` to inspect a branch on a different port. The platform still routes its public URL to 3000.

## Changing the framework

Maintain these contracts: `npm start` serves on `0.0.0.0:3000`; `npm test` checks meaningful behaviour; `npm run build` builds if needed; `/api/health` returns `{ "ok": true, "revision": "..." }` using `APP_REVISION`. Keep package-lock.json current. Install/build steps run in the archived release. Update deployment and smoke checks deliberately if you choose different contracts.

The starter does not automatically load .env. Export local variables or use your runtime's documented env loader. For the deployed process, keep secrets outside Git in `~/.config/vibecode-workshop/app.env` (systemd EnvironmentFile format). Create it yourself only if needed, restrict it to your user, and never paste its contents into evidence. Do not override PORT or APP_REVISION there.

Store persistent data outside release folders, for example `~/.local/share/vibecode-workshop/data/`. Releases are immutable snapshots; app databases/uploads must not be tied to a deploy directory.

## Diagnose before changing infrastructure

| Failure | Next check |
|---|---|
| No SSH access | Assigned command, uploaded public key and organiser's sync status |
| `deploy` refuses the user or the guest contract | `whoami` must be `vc-team`. Ask the organiser to check `/etc/vc-guest-contract`, `vc-app.service` and lingering. Do not remove the guard |
| Dirty checkout / wrong branch | Save your work, review/merge it, then deploy main |
| Tests, install or build fail | Fix the source; the live service has not yet been changed |
| Local health fails | `vc-app status` and `vc-app logs`; check port 3000 and `npm start` |
| Local health succeeds, HTTPS fails | Give the organiser the time and public error; ask them to check DNS/tunnel |
| Revision differs | Confirm `git rev-parse HEAD` against local and public health responses |
| SSH command no longer works after a rename | Ask the organiser for the assigned identity; do not create replacement infrastructure |
| Recovery says it needs the organiser | Do not delete `~/workshop`, releases or data. Ask the organiser to inspect `vc-app` |

A failed deployment may interrupt the demo briefly. Recovery restores the previous release or the placeholder where possible; it cannot undo application data writes or schema changes. Do not delete releases/data or reinstall the guest to repair a process. Ask the organiser if recovery reports failure.
