# Starter validation

## Source checks

- `npm ci`: passed; no runtime dependencies.
- `npm test`: five tests passed, zero failed/skipped.
- Initial `npx -y node@22 --test` invoked the system Node 26 here; that command did not verify Node 22. Corrected by downloading the official Node 22.23.3 Linux binary, verifying its SHA-256 against the upstream manifest, checking `--version`, then running its absolute binary path with `--test`: five passed, zero failed/skipped.
- Local Markdown link check: all referenced local paths exist.
- A fresh local clone passed `npm ci`, all five tests, doctor and deployment preview.
- Tracked-file scan found no credentials, private IP addresses or attribution trailers.
- Deployment preview passed; live deploy correctly refused the non-student author account before any service change.
- Smoke accepted the exact locally served Git revision and rejected a mismatched revision. No public endpoint was tested.

## Browser

Chromium inspected at 1440×1000 and 375×812: page returned 200, all three steps appeared, no horizontal overflow, keyboard Tab focused a link, the health link returned the expected response, and no page errors occurred. Phone screenshot inspected visually. Browser evidence stays local under ignored .ai/browser/.

## Limits

No team container, SSH, DNS, public URL, systemd installation, restart or recovery has been exercised here. Deployment unit generation is tested; actual platform compatibility and rollback require the organiser's fresh-team rehearsal in docs/organiser.md. Agent login instructions were checked against linked official provider guides; no participant accounts were authenticated.

This report describes checks, not workshop hosting readiness.
