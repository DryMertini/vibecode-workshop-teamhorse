# Starter validation

## Source checks

- `npm ci`: passed; no runtime dependencies.
- `npm test`: five tests passed, zero failed/skipped.
- `npx -y node@22 --test`: the same five tests passed under Node 22.
- Local Markdown link check: all referenced local paths exist.

## Browser

Chromium inspected at 1440×1000 and 375×812: page returned 200, all three steps appeared, no horizontal overflow, keyboard Tab focused a link, the health link returned the expected response, and no page errors occurred. Phone screenshot inspected visually. Browser evidence stays local under ignored .ai/browser/.

## Limits

No team container, SSH, DNS, public URL, systemd installation, restart or recovery has been exercised here. Deployment unit generation is tested; actual platform compatibility and rollback require the organiser's fresh-team rehearsal in docs/organiser.md. Agent login instructions were checked against linked official provider guides; no participant accounts were authenticated.

This report describes checks, not workshop hosting readiness.
