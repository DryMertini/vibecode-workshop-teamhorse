# Current focus

**The hosting path is proven and the reviewed starting page is live** at the team's public URL, served by the assigned guest at revision `c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645` (`main`). The public URL currently shows the **starter page**, not the running-club board — M1.2/M1.3 have not been built yet. Nothing about the journey is hosted-accepted.

Next, in order:

1. **Open the M1.1 pull request in the fork** — `m1.1-trustworthy-baseline` is pushed at `9aa24c32f5dcb04fd40d5610186046498929dde5`, reviewed and approved. The fork has **zero pull requests** so far, GitHub Actions are **disabled** on the fork, and the GitHub CLI is not installed, so the human opens and merges it in the browser. PR body: `.ai/work/M1.1/pr.md`. The Linux half of the M1.1 acceptance is already proven independently on the guest (21/21 at both revisions, real util-linux `flock`).
2. **Add `team-*.key` and `team-*.known_hosts` to `.gitignore`** in the next step. The handout key was found in the repository root during this session and moved out; the in-repo copies are gone, but the file pattern is not yet ignored.
3. **Then M1.2/M1.3** — the board: post a run, see it on another device, survive a server restart, and tap "I'm in" with an optional name. One branch, one PR, one review.

Open items the human still owns: the M1.1 pull request and its merge, enabling Actions on the fork, and the milestone acceptance decision.

Note for the next session: `.ai/context.md` previously described M13.27 as "waiting for re-review, nothing pushed or merged". That is stale — PR #1 merged those commits into `main` (`c3e2c39`).
