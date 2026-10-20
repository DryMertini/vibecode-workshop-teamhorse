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

The helper checks that this machine is the assigned guest (`vc-team`, contract `user-app-v1`, the placeholder user unit, and user lingering). It checks main and a clean checkout, then takes an exclusive deploy lock so only one deploy runs on the guest. A second run exits immediately and says another deploy is running. The lock is released when the process exits, including after a failure or a kill, so a dead run does not block the next one. It runs tests, archives that commit into a new release directory, installs dependencies and runs an optional build. Install and build run inside a user scope with `MemoryMax=2G` and `MemorySwapMax=0` (`BUILD_MEMORY_MAX` in `scripts/deploy.mjs`). That leaves about 1GiB on a 3GiB guest for the serving app, sshd and the user manager. If that limit cannot be applied, or the build exceeds it, the command fails and does not switch the service. It then installs a user drop-in for `vc-app.service` pointing at that release and restarts the user service. It does not rewrite `~/workshop` or application data. It checks the local health endpoint and intended revision. If startup fails, it restores the previous drop-in, or removes the drop-in so the placeholder serves again, and reports any recovery failure. After that recovery succeeds, it removes only the failed new release directory. After the new release passes its health check, it keeps that release and the previous one (the release rollback would restore) and removes older directories under the releases folder only. It never removes `~/workshop`, application data, or a path outside the releases directory.

The user manager keeps running after you disconnect because lingering is enabled. Disconnect only after the command has finished.

Inside the container, verify local health:

```sh
curl --fail http://127.0.0.1:3000/api/health
```

On your **laptop**, verify the public route:

```sh
npm run smoke -- https://YOUR-ASSIGNED-URL
```

Open the assigned URL in a browser and ask a teammate to try it on a phone. A local health check does not prove DNS, the tunnel, TLS or the user journey.

> [!IMPORTANT]
> Run `npm run smoke -- https://YOUR-ASSIGNED-URL` on your **laptop** to verify the public HTTPS route. On the guest, `npm run smoke` automatically probes local `127.0.0.1:3000` because Cloudflare challenges outbound requests originating from the server's own datacenter IP. Similarly, team applications running on the server cannot make outbound HTTP requests to their own or another team's `https://*.intra.land` public URL.

## Later deployment

Use the same commands after the team's next milestone release. No automatic GitHub deployment is installed. The script snapshots the checked-out commit; it does not fetch by itself, so confirm the revision before running it. A later deploy restarts `vc-app.service` onto the new release after that release passes its health check. The previous release directory remains on disk so rollback still has a target. Older release directories are removed.

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

If you replace the starter with Next.js, Vite, or another framework, you must preserve these deployment contracts:
1. **Preserve scripts in package.json:** keep `"deploy": "node scripts/deploy.mjs"`, `"smoke": "node scripts/smoke.mjs"`, `"doctor": "node scripts/doctor.mjs"`, and a `"test"` script.
2. **Preserve the `scripts/` directory:** `scripts/deploy.mjs`, `scripts/smoke.mjs`, and `scripts/doctor.mjs` must remain in the repository.
3. **Commit the lockfile:** keep `package-lock.json` committed. Deployment runs `npm ci` inside a 2G memory-bounded scope.
4. **`start` script:** `npm start` must listen on `PORT` (or default `3000`), binding to `0.0.0.0` or `127.0.0.1`.
5. **`/api/health` endpoint:** must return HTTP 200 JSON `{"ok": true, "revision": "..."}` matching `process.env.APP_REVISION`. (Deployment automatically sets both `APP_REVISION` and `WORKSHOP_GIT_SHA` in the systemd service environment.)
6. **Network restriction:** server applications running on the container cannot make HTTP calls to their own or another team's public `https://*.intra.land` URL. Use `http://127.0.0.1:3000/api/health` for local health checks.
7. **Test contract:** Deployment executes `npm test` before building or switching releases, refusing if tests fail. When replacing or deleting the starter's `server.mjs`, delete or rewrite `test/app.test.mjs` (which imports `server.mjs`); keep `test/deploy.test.mjs` (which verifies deployment scripts) and set `"test": "node --test test/deploy.test.mjs"` (or your framework's test runner).

The starter does not automatically load .env. Export local variables or use your runtime's documented env loader. For the deployed process, keep secrets outside Git in `~/.config/vibecode-workshop/app.env` (systemd EnvironmentFile format). Create it yourself only if needed, restrict it to your user, and never paste its contents into evidence. Do not override PORT or APP_REVISION there.

Store persistent data outside release folders, for example `~/.local/share/vibecode-workshop/data/`. Releases are immutable snapshots; app databases/uploads must not be tied to a deploy directory.

### Proven recipe: Next.js 16 (create-next-app with App Router)

Next.js 16 defaults to `cacheComponents: true` in `next.config.ts`. With this default, route handlers are prerendered statically at build time unless dynamic features are invoked. Because `APP_REVISION` is only known at runtime on the server, a plain `GET` route will be prerendered without the revision. Furthermore, `export const dynamic = "force-dynamic"` is forbidden by `cacheComponents` and causes a build failure.

The proven solution is to `await connection()` from `next/server` inside the handler:

Create `app/api/health/route.ts`:
```typescript
import { connection } from 'next/server';

export async function GET() {
  await connection();
  return Response.json({
    ok: true,
    revision: process.env.APP_REVISION || 'development',
  });
}
```

In `package.json`, keep:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "node --test test/deploy.test.mjs",
    "deploy": "node scripts/deploy.mjs",
    "smoke": "node scripts/smoke.mjs",
    "doctor": "node scripts/doctor.mjs"
  }
}
```
`next start` automatically honours `PORT=3000` and binds all interfaces. Remember to delete or update `test/app.test.mjs`, keep `scripts/` and `test/deploy.test.mjs`, and commit `package-lock.json`.

### Proven recipe: Static Vite SPA (React, Vue, Vanilla)

Vite's default build (`npm run build`) outputs static HTML/JS/CSS to `dist/`. Vite preview ignores `PORT` (defaults to 4173) and has no `/api/health` endpoint. To serve the built SPA on port 3000 with health checks and secure static routing, provide a standalone `spa-server.mjs`:

Create `spa-server.mjs`:
```javascript
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const REVISION = process.env.APP_REVISION || 'development';
const DIST = resolve('dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, revision: REVISION }));
    return;
  }
  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' });
    res.end('Bad Request');
    return;
  }
  const filePath = resolve(DIST, '.' + decoded);
  if (filePath !== DIST && !filePath.startsWith(DIST + sep)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
    return;
  }
  let target = filePath;
  if (!existsSync(target) || statSync(target).isDirectory()) {
    target = join(DIST, 'index.html');
  }
  if (!existsSync(target)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
    return;
  }
  const ext = extname(target);
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
  createReadStream(target).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Serving dist/ on http://${HOST}:${PORT}`);
});
```

In `package.json`, keep:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node spa-server.mjs",
    "test": "node --test test/deploy.test.mjs",
    "deploy": "node scripts/deploy.mjs",
    "smoke": "node scripts/smoke.mjs",
    "doctor": "node scripts/doctor.mjs"
  }
}
```
Remember to delete or update `test/app.test.mjs`, keep `scripts/` and `test/deploy.test.mjs`, and commit `package-lock.json`.

## Diagnose before changing infrastructure

| Failure | Next check |
|---|---|
| No SSH access | Handout team key, chmod 600 permissions, known_hosts file, or teammate ~/.ssh/authorized_keys |
| `deploy` refuses the user or the guest contract | `whoami` must be `vc-team`. Ask the organiser to check `/etc/vc-guest-contract`, `vc-app.service` and lingering. Do not remove the guard |
| Dirty checkout / wrong branch | Save your work, review/merge it, then deploy main |
| Tests, install or build fail | Fix the source; the live service has not yet been changed |
| Another deploy is running | Wait for it to finish and retry. Do not delete the lock file |
| Install or build hits the 2G memory limit, or the memory controller is not delegated | The live service was not changed. Shrink the build, or ask the organiser to delegate the memory controller |
| Local health fails | `vc-app status` and `vc-app logs`; check port 3000 and `npm start` |
| Local health succeeds, HTTPS fails | Give the organiser the time and public error; ask them to check DNS/tunnel |
| Revision differs | Confirm `git rev-parse HEAD` against local and public health responses |
| SSH command no longer works after a rename | Ask the organiser for the assigned identity; do not create replacement infrastructure |
| Recovery says it needs the organiser | Do not delete `~/workshop`, the active release, the previous release, or data. Ask the organiser to inspect `vc-app` |

A failed deployment may interrupt the demo briefly. Recovery restores the previous release or the placeholder where possible; it cannot undo application data writes or schema changes. Do not delete the active release, the previous release, or data, and do not reinstall the guest to repair a process. Ask the organiser if recovery reports failure.
