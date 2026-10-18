# Set up the agent team

## Choose tools you can already access

Start with one coding agent you can sign into and a fresh reviewer session. Different model families are preferable for writer and reviewer, but never imply a second provider ran if it did not. The roles are real responsibilities and separate sessions, not six agents permanently consuming resources.

Run agents on your laptop in your team checkout. Use the workshop SSH shell to run the deployed app. A remote agent is optional and requires your own authorised login on that machine.

### Codex

Follow the [official Codex CLI installation and sign-in guide](https://learn.chatgpt.com/docs/codex/cli). The macOS/Linux standalone installer documented there is:

```sh
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Then, from the repository directory:

```sh
codex
```

Use your own account and complete the sign-in prompts. Read the installer before running it if you want to inspect what it changes. Availability depends on your account; the starter does not provide a subscription or API credits. Keep permission controls enabled. Codex uses AGENTS.md as project instructions.

### Claude Code

Follow the [official Claude Code quickstart](https://code.claude.com/docs/en/quickstart). The macOS/Linux/WSL native installer documented there is:

```sh
curl -fsSL https://claude.ai/install.sh | bash
```

Then run `claude` from the repository directory and complete your own sign-in. CLAUDE.md points to AGENTS.md. The linked guide covers Windows installation too. Use your own account; access is not supplied by this repository.

### Other tools and IDEs

Use your preferred editor/agent if it can inspect files, propose changes and run the project's checks. Explicitly ask it to read AGENTS.md; do not assume every tool discovers it. For Grok or another CLI, use the provider's current installation/login instructions and confirm which agent/model actually started. No undocumented command flags are required here.

## Start the project lead

Open a new session in the repository. Paste the lead prompt from README.md. The lead should inspect the code, help complete IDEA.md and propose a small PLAN.md. Agree M1 with your teammates before implementation.

## Start the milestone lead

In another **fresh** session, paste:

> Read AGENTS.md, IDEA.md, PLAN.md, .ai/context.md and .ai/roles/milestone-lead.md. You are milestone lead for M1. Audit its starting state. Create the next step brief using .ai/templates/brief.md. Identify dependencies and the evidence required. Coordinate separate coder, reviewer and committer sessions. Do not write implementation code or pretend that sessions were launched when they were only described.

For each step, open the role's own fresh session and give it the step brief and role file. The milestone lead supplies actual branch/base/head information, not placeholders. Use the [role cards](../.ai/roles/) and [worked handoff](workflow.md).

## Session discipline

Two terminals in the same folder share a checkout. Do not run competing writers or branch switches at once. Leave the writer idle while the reviewer inspects its committed branch. The reviewer receives the brief, committed diff and evidence rather than the coder's reasoning. If a tool supports orchestration, use its native workflow; if you dispatch manually, say so.

No file in this starter starts agents automatically. This manual route works without Orca, MCP or vendor-specific subagent features. If you use Orca, follow its installed version's guide and verify the actual Tasks and workers; do not call a bare CLI session orchestrated.

Design can be explored in the design tool your team has access to, including Figma or a design-capable agent. Save a chosen reference in the repo and write visual acceptance criteria. Access to any named design product is not supplied here.

Optional integrations belong in [tools.md](tools.md). First make the core loop work.
