---
name: code-review
description: Automated code review, intent verification, and rule compliance engine. Triggers automatically before finalizing code edits, committing changes, or proposing technical solutions.
---

# Autonomous Code Review & Quality Assurance Skill

## Purpose & Scope
This skill provides a rigorous, automated quality-control gate for all code changes, refactors, bug fixes, and infrastructure manifests across the codebase. It ensures every code modification fulfills its stated intent, adheres strictly to project rules, and undergoes an autonomous critique-and-refinement loop before being finalized or presented to the user.

---

## 4-Phase Review Methodology

### Phase 1: Intent & Acceptance Criteria Verification
Before inspecting or writing code, explicitly establish:
1. **The Goal**: What problem does this change solve, or what feature does it implement?
2. **Acceptance Criteria**: What exact empirical behavior, metric, or output proves success?
3. **Scope Check**: Is the change scoped tightly to the goal, or does it introduce unrequested side effects?

---

### Phase 2: Compliance Audit against Repository Rules
Validate the change against `AI_RULES.md` and `docs/ARCHITECTURE.md`:
* **Rule 1 (Pristine Codebase & Zero Magic Numbers)**: Are all timeouts, ports, limits, and magic constants extracted into named `const` variables?
* **Rule 2 (Deep Thought & Fact-Checking)**: Is the solution backed by empirical logs/facts rather than assumptions?
* **Rule 5 (Strict Confidentiality)**: Are zero credentials, private keys, or API tokens committed?
* **Rule 8 ($0 Cost / Bare Minimum Footprint)**: Does the change respect resource constraints (max 200m CPU / 256Mi RAM)?
* **Rule 11 (True GitOps Architecture)**: Does the change go through Git/ArgoCD rather than fragile inline SSH hacks?
* **Rule 12 (Continuous Alignment Loop)**: Are `RELEASES.md` and `README.md` updated to reflect the new state?

---

### Phase 3: Technical Quality & Anti-Pattern Check
Ensure the implementation avoids common pitfalls:
* **No Symptom Patches**: Verify that errors are fixed at the root cause, not masked with dummy fallbacks or swallowed exceptions.
* **Concurrency & Memory Safety**: Ensure goroutines terminate cleanly, mutexes prevent data races, and socket/file resources are closed (`defer close()`).
* **Signature & Prop Consistency**: Verify that function signatures and component props match all invocation call sites.
* **Human-Readable Metrics & UX**: Ensure Grafana metrics use human-readable units (`decbytes`, `Bps`, `percent`, `short`) and log statements are structured.

---

### Phase 4: Autonomous Critique & Refinement Loop (Max 3 Iterations)

When evaluating a proposed implementation, execute up to **3 internal critique iterations**:

```
 ┌────────────────────────────────────────────────────────┐
 │ Iteration 1: Draft Solution & Evaluate against Rules   │
 └───────────────────────────┬────────────────────────────┘
                             │
            [Passes All Checks & Rules?]
               ├── YES ──► Finalize & Commit
               └── NO  ──► Refine Code (Iteration 2)
                             │
            [Passes All Checks & Rules?]
               ├── YES ──► Finalize & Commit
               └── NO  ──► Refine Code (Iteration 3)
                             │
            [Passes All Checks & Rules?]
               ├── YES ──► Finalize & Commit
               └── NO  ──► Escalate to User with options
```

1. **Iteration 1 (Initial Review)**: Evaluate the proposed diff/solution against Phase 1–3. If flaws or superior design patterns are found, self-correct immediately.
2. **Iteration 2 (Refinement Review)**: Re-assess the revised solution. Verify that no secondary bugs or regression edge-cases were introduced.
3. **Iteration 3 (Final Check & Escalation Gate)**:
   - If the code passes all checks: Finalize the implementation and run verification commands.
   - If architectural ambiguity or trade-offs remain after 3 iterations: Stop and present clear, structured options to the user.
