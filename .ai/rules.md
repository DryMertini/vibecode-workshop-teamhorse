# Constraints learned from this project

- The workshop reverse proxy expects the app on port 3000. The starter binds to 0.0.0.0.
- Only files under public/ are web assets. Never expose the repository root or .env files.
- `/api/health` returns the app status and deployed revision; do not put secrets in it.
- Deployments use archived commits in separate release directories. Durable data belongs outside those directories, for example under `~/.local/share/vibecode-workshop/data/`.
- Workshop DNS, SSH access and containers are organiser-managed. Use assigned connection details.
- The initial deployment script assumes Linux, systemd, the student account and authorised passwordless sudo inside the assigned container. It refuses other users; it is not a laptop deployment tool.

Add constraints when code or observed behaviour establishes them. Workflow rules live in AGENTS.md.
