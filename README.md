# Vibecode workshop

Turn an idea into a useful, working demo with AI agents. Start with a live page, plan small changes, review the evidence, and improve it with feedback.

## Start here

1. **One fork per team.** Fork [this repository](https://github.com/ikodo0/vibecode-workshop/fork), then invite your teammates as collaborators in your fork's Settings. Work in the team's fork; do not send your project PRs to this starter.
2. **Connect.** Follow [connection instructions](docs/connect.md) for GitHub, your workshop SSH key and assigned environment.
3. **Run it.** Install Node.js 22 or newer on your laptop, or use Node in the workshop environment. Clone your fork, then run:

   ```sh
   npm ci
   npm test
   npm start
   ```

   Open `http://localhost:3000` on the machine running the app. On the workshop guest, clone into `~/src/team`, not `~/workshop`; the placeholder may already listen on port 3000. For the public URL, follow [deployment](docs/deploy.md).
4. **Start your lead.** Open your chosen coding agent in the repository and paste:

   > Read AGENTS.md, IDEA.md, PLAN.md and .ai/roles/project-lead.md. You are the project lead. Inspect the starting code. Help us turn the assigned idea into one small useful journey. Challenge assumptions, draft the plan and ask us about decisions that change the goal. Do not implement until we agree the first milestone.

5. **Build through the roles.** Use the [agent setup](docs/agents.md) and [workflow](docs/workflow.md): project lead → milestone lead → coder → reviewer → committer.
6. **Ship and learn.** Deploy the reviewed revision, observe someone using it, and use [feedback](docs/feedback.md) to choose the next change. Submit your fork URL and live URL at [the workshop page](https://intra.land/vibecode).

## What is included

| File or folder | Its job |
|---|---|
| [AGENTS.md](AGENTS.md) | Shared instructions and responsibility boundaries |
| [IDEA.md](IDEA.md) | The user, problem and desired outcome |
| [PLAN.md](PLAN.md) | Milestones, permanent step IDs, acceptance criteria and dependencies |
| [.ai/roles/](.ai/roles/) | Copyable role briefs for separate agent sessions |
| [.ai/templates/](.ai/templates/) | Brief, review and session handoff templates |
| [.ai/rules.md](.ai/rules.md), [.ai/pitfalls.md](.ai/pitfalls.md) | Project constraints and lessons |
| [docs/](docs/) | Connections, workflow, deployment, recovery and optional tools |
| [server.mjs](server.mjs), [public/](public/) | A tiny runnable page and health endpoint |
| [scripts/](scripts/) | Preflight, deployment preview, deployment and smoke checks |
| [.github/](.github/) | CI and PR template |

This is a starter, not an automatic agent launcher. Each role needs a real session and an explicit handoff. A fresh reviewer checks the committed diff; a changed chat title does not create independence. You can use an IDE agent or terminal agent. No MCP server, API key, or orchestration platform is required by the starter.

## Commands

```sh
npm run doctor                 # local tools, Git remotes and repository checks
npm start                      # page on port 3000
npm test                       # real HTTP and deployment-contract tests
npm run deploy:preview         # print the vc-app user drop-in, without changing services
npm run deploy                 # assigned workshop guest only, as vc-team, without sudo
npm run smoke -- https://YOUR-ASSIGNED-URL  # run on your laptop to verify public HTTPS
```

The supplied deploy command deploys the checked-out, committed `main` revision manually. A GitHub push does not deploy it. No participant DNS changes are required. Use the SSH command and HTTPS URL supplied by the organiser; never infer connection details from a display name.

Run `npm run smoke -- https://YOUR-ASSIGNED-URL` on your laptop to verify the public HTTPS route. On the workshop guest, run `curl --fail http://127.0.0.1:3000/api/health` or `npm run smoke -- https://YOUR-ASSIGNED-URL` (on the guest, smoke automatically probes local `127.0.0.1:3000` because Cloudflare challenges datacenter IPs; on your laptop it checks the public HTTPS route). A team app cannot call its own or another team's public URL from inside the container.

### Replacing the framework

Your team may change frameworks (e.g. Next.js, Vite) after updating the run, build, health and deployment contracts. If you replace the starter, you must preserve:
1. The `"deploy": "node scripts/deploy.mjs"`, `"smoke": "node scripts/smoke.mjs"`, `"doctor": "node scripts/doctor.mjs"`, and `"test": "..."` scripts in `package.json`.
2. The `scripts/` directory (`scripts/deploy.mjs`, `scripts/smoke.mjs`, `scripts/doctor.mjs`).
3. A committed `package-lock.json` (`npm ci` runs during deployment).
4. A `"start"` script listening on `PORT` (or default `3000`), binding to `0.0.0.0` or `127.0.0.1`.
5. A `/api/health` route returning JSON `{"ok": true, "revision": "..."}` matching `process.env.APP_REVISION`.
6. Deployment runs `npm test` first and refuses on failure. When you replace or delete the starter's `server.mjs`, delete or rewrite `test/app.test.mjs` (which imports `server.mjs`), and keep `test/deploy.test.mjs` (set `"test": "node --test test/deploy.test.mjs"` or your framework test runner).

See [deployment guide](docs/deploy.md) for proven copy-paste recipes for Next.js 16 and static Vite SPAs. Keep the first useful demo small. [Organiser preflight](docs/organiser.md) lists what must be verified before handing this starter to students.
