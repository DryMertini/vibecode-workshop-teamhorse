# M13.27 deploy guard fixes

Branch `ikodo0/m13.27-native-guest-deploy`, starting from `a4d7746`.

## Commits

- `c90b3a19842207e2d552a9d17c8105f8c1fb3162` — fix: prune releases, bound build memory, and lock deploys
- `f11b2ea2ce4b0e3150dd0211925e754710b020b0` — fix: document release pruning, the deploy lock, and the 2G build limit

## F1 — prune releases

After the new release passes its health check, the helper keeps that release and the `WorkingDirectory` of the previous drop-in, and deletes only other real directories inside the releases folder. Paths outside that folder, including `~/workshop`, the data directory, and the releases directory itself, throw and delete nothing. If the previous drop-in is not null and has no `WorkingDirectory`, pruning is skipped. A failed deploy removes only the new release directory it just created: immediately when the drop-in was never switched (the previous app is still serving), or after recovery succeeds when it was switched. A failed recovery deletes nothing.

## F2 — memory-bound install and build

`BUILD_MEMORY_MAX` is `2G` (2 GiB). `npm ci` and `npm run build` run as `systemd-run --user --scope --quiet -p MemoryMax=2G -p MemorySwapMax=0`. Deploy refuses first if the user manager's `cgroup.subtree_control` does not contain `memory`, or if a `/bin/true` scope with those properties does not start. The drop-in is written only after both commands succeed. Exit 137 or `SIGKILL` is reported as the memory limit; any other failure is reported as a command failure. Neither switches the service.

Host only, not a guest: the user manager control group was `user@.service` and its `cgroup.subtree_control` contained `memory`. A 2G scope reported `MemoryMax=2147483648`. The same properties on `/bin/true` exited 0. A 32M scope with `MemorySwapMax=0` around a 96MB allocation was killed (`signal SIGKILL` from `spawnSync`; an earlier shell run exited 137 with `Result=oom-kill`) and the calling shell stayed up. `MemoryOOMGroup` is not a valid assignment here, so it is not set. Whether this holds inside a 3GiB guest with `memory.oom.group=1`, and whether a Next.js install stays under 2G, was not run. No server was contacted.

## F3 — one deploy at a time

`acquireDeployLock` holds `flock -n` on a file under `~/.local/share/vibecode-workshop/deploy.lock`, not inside the releases directory. The second caller throws `Another deploy is running` without waiting. `release()` closes the fd, and the kernel drops the lock if the process is killed. The lock is taken after the guest checks and released in a `finally`, including failure and recovery.

## Checks

`node --check` on `scripts/deploy.mjs`, `scripts/doctor.mjs`, `scripts/smoke.mjs`, `server.mjs`, `test/deploy.test.mjs` and `test/app.test.mjs` exited 0.

`npm test` (`node --test`), 18/18 passed, 0 failed, duration 144ms:

```
✔ page, CSS and health are reachable and health identifies the served revision
✔ repository files and traversal requests cannot be downloaded
✔ HEAD has no body and unsupported writes are rejected
✔ drop-in points the user service at a release without a system user or privilege directive
✔ preview names an uninstalled release and does not require the guest
✔ unsafe service interpolation is rejected before any unit can be installed
✔ guest guard accepts only the image contract and refuses each missing marker
✔ deploy refuses a dirty tree, a non-main branch, and the placeholder checkout
✔ releases cannot occupy the placeholder or application data
✔ recovery restores the previous drop-in or falls back to the placeholder unit
✔ deploy helper does not call a privilege tool or install a system unit
✔ prune keeps the active release and the rollback release
✔ a first deploy keeps only the active release when rollback is the placeholder
✔ an unreadable previous drop-in does not prune
✔ prune refuses paths outside the releases directory and deletes nothing
✔ install and build stay under the 3GiB guest limit
✔ memory delegation recognises only the memory controller
✔ deploy lock rejects a second holder and releases when the holder dies
ℹ pass 18
ℹ fail 0
```

## Not proven

- `systemd-run --user` `MemoryMax` on an actual team guest.
- A real `npm ci` / framework build under the 2G cap.
- Hosted smoke. Nothing was pushed or merged.
