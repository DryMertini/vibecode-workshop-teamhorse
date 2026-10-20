# Pitfalls

Add incidents when they occur: date, symptom, cause, correction and how to detect recurrence. Do not turn guesses into historical incidents.

## 2026-10-20 — `npm test` red on a macOS laptop

- Symptom: on this macOS laptop `npm test` reported 20 passing and 1 failing, `deploy lock rejects a second holder and releases when the holder dies`, with `Cannot lock deploy because flock is missing`. CI on `ubuntu-latest` was green.
- Cause: the deploy lock shells out to util-linux `flock`, which macOS does not ship, and the test called `acquireDeployLock` without accounting for a missing binary.
- Correction: scheduled as M1.1 — the case must assert the "flock is missing" guard error where the binary is absent and keep the real lock assertions where it exists. Not corrected in this session.
- Detect recurrence: run `npm test` on a macOS laptop before trusting a local green or red run, and read which case failed before blaming the change under review.
