# Deploy the team's demo

Do this inside the assigned interactive team SSH shell from [connect.md](connect.md). The supplied helper expects Linux, systemd, user `student` and passwordless sudo in your own team container. It must not be run on the platform host or a laptop.

## First deployment

Clone your team fork into `~/workshop` if you have not already. Release only a reviewed main revision accepted by your team:

```sh
cd ~/workshop
git status --short
git switch main
git pull --ff-only origin main
npm ci
npm test
npm run deploy:preview
npm run deploy
```

If Git is dirty, preserve and commit the appropriate work on its branch before switching. Do not use a reset to make deployment proceed.

The helper checks main and a clean checkout, runs tests, archives that commit into a new release directory, installs dependencies and runs an optional build. It then installs a team-local `workshop-app.service`, stops the platform hello service if active, and starts the app. It checks the local health endpoint and intended revision. If startup fails, it attempts to restore the previous unit/hello service and reports any recovery failure. Releases are retained; the helper never prunes them or deletes application data.

```sh
curl --fail http://127.0.0.1:3000/api/health
npm run smoke -- https://YOUR-ASSIGNED-URL
```

Open the assigned URL in a browser and ask a teammate to try it on a phone. A local health check does not prove DNS, the tunnel, TLS or the user journey.

## Later deployment

Use the same commands after the team's next milestone release. No automatic GitHub deployment is installed. The script snapshots the checked-out commit; it does not fetch by itself, so confirm the revision before running it.

```sh
sudo systemctl status workshop-app --no-pager
sudo journalctl -u workshop-app -n 80 --no-pager
```

If you use local `npm start` in the container while the service is running, port 3000 will already be in use. On your laptop, use `PORT=3001 npm start` to inspect a branch on a different port. The platform still routes its public URL to 3000.

## Changing the framework

Maintain these contracts: `npm start` serves on `0.0.0.0:3000`; `npm test` checks meaningful behaviour; `npm run build` builds if needed; `/api/health` returns `{ "ok": true, "revision": "..." }` using `APP_REVISION`. Keep package-lock.json current. Install/build steps run in the archived release. Update deployment and smoke checks deliberately if you choose different contracts.

The starter does not automatically load .env. Export local variables or use your runtime's documented env loader. For the deployed process, keep secrets outside Git in `~/.config/vibecode-workshop/app.env` (systemd EnvironmentFile format). Create it yourself only if needed, restrict it to your user, and never paste its contents into evidence. Do not override PORT or APP_REVISION there.

Store persistent data outside release folders, for example `~/.local/share/vibecode-workshop/data/`. Releases are immutable snapshots; app databases/uploads must not be tied to a deploy directory.

## Diagnose before changing infrastructure

| Failure | Next check |
|---|---|
| No SSH access | Assigned command, uploaded public key and organiser's sync status |
| `deploy` refuses the user | Check `whoami`; do not remove the guard |
| Dirty checkout / wrong branch | Save your work, review/merge it, then deploy main |
| Tests, install or build fail | Fix the source; live service has not yet been changed |
| Local health fails | Inspect the unit and its logs; check port and start command |
| Local health succeeds, HTTPS fails | Give organiser the time and public error; ask them to check DNS/tunnel |
| Revision differs | Confirm `git rev-parse HEAD` against local and public health responses |
| SSH command no longer works after a rename | Ask organiser for the assigned identity; do not create replacement infrastructure |

A failed deployment may interrupt the demo briefly. Recovery restores processes/configuration where possible; it cannot undo application data writes or schema changes. Do not delete releases/data or reinstall the container to repair a process. Ask the organiser if recovery reports failure.
