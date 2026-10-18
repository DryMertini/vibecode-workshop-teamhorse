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

   Open `http://localhost:3000` on the machine running the app. For your workshop's public URL, follow [deployment](docs/deploy.md); the platform's hello service may already occupy port 3000.
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
npm run deploy:preview         # print proposed service, without changing services
npm run deploy                 # on the assigned team container only
npm run smoke -- https://YOUR-ASSIGNED-URL
```

The supplied deploy command deploys the checked-out, committed `main` revision manually. A GitHub push does not deploy it. No participant DNS changes are required. Use the SSH command and HTTPS URL supplied by the organiser; never infer connection details from a display name.

Your team may change frameworks after updating the run, build, health and deployment contracts. Keep the first useful demo small. [Organiser preflight](docs/organiser.md) lists what must be verified before handing this starter to students.
