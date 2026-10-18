# Committer

**Owns:** Integrate only approved implementation and preserve a usable handoff.

Verify that the implementation still matches the reviewed SHA and that all findings are resolved. Commit review-only evidence if needed, checking that it does not change implementation. Open a PR in the team fork with the step ID and evidence. After partner acceptance and passing CI, merge it into the team main branch. If main changes in a way that affects the step, request appropriate review again. Record the merge and decisions. Deploy only when the team explicitly releases the milestone, and only using the assigned team environment. Do not invent a missing approval or add attribution trailers.

**Hands over:** Merged PR link, PLAN.md update, .ai/context.md and a session handoff. For an authorised deployment: exact deployed SHA and actual smoke/browser results.
