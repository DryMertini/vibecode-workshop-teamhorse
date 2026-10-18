# Organiser preflight

Before directing students here, use a fresh fork and a real non-admin participant account. This starter is not evidence that workshop hosting is ready.

- Verify registration, team membership and each participant's SSH-key upload.
- Give each team its actual SSH command, verified host fingerprint and HTTPS URL through the workshop's private connection UI/channel.
- Verify an uploaded key reaches only its authorised team; do not share organiser credentials.
- Check the container's student user, Node 22+, npm, Git, systemd and passwordless sudo assumptions against the actual provisioning.
- Clone a fresh public fork through the interactive team shell and run the documented first deployment. Check dependency install/build network access.
- Confirm the initial hello unit is named `team-hello.service`, as expected by the deploy helper.
- Prove hello-page replacement, local health, public HTTPS, reported revision, phone browser and a later deployment.
- Prove the app survives SSH disconnection and document the actual host/container reboot behaviour. The app unit can be enabled, but this starter cannot establish container/platform reboot recovery.
- Verify an intentionally failed app startup restores the previous app or hello service without deleting work. Platform failure recovery belongs to the organiser.
- Test rename/leave/rejoin/key changes against the platform's work-preservation contract before promising any URL behaviour. This starter neither changes DNS nor provisions containers.
- Confirm every team can use at least one agent account and has a workable fresh-review session. The starter supplies no shared subscriptions.
- Show the team's fork/default remote so PRs stay within the team. CI checks code; it does not deploy.
- Keep the workshop schedule and registration rules on intra.land/vibecode. Do not maintain a competing copy here.

Record actual proof and gaps in your organiser workspace. Never put private addresses, participant keys or credentials into this public repo. A localhost test cannot substitute for this preflight.
