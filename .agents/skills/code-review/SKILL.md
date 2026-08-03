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

### Phase 2: Comprehensive 13-Rule Compliance Audit
Validate the change against **ALL 13 Rules** in `AI_RULES.md` systematically:
* **Rule 1 (Pristine Codebase & Zero Magic Numbers)**: Are all constants, limits, and timeouts named?
* **Rule 2 (Deep Thought & Fact-Checking)**: Is the solution backed by empirical logs/facts rather than assumptions?
* **Rule 3 (Strict Cloud Execution Environment)**: Zero code executed locally on the user's laptop; all builds and runs happen in the cloud via CI/CD and K3s.
* **Rule 4 (Official Documentation as the Bible)**: Checked official framework docs before implementing?
* **Rule 5 (Strict Confidentiality)**: Zero plain-text credentials, API keys, or secrets in git?
* **Rule 6 (Release Notes vs. README)**: Exhaustive version log in `RELEASES.md`, visual diagrams in `README.md`?
* **Rule 7 (Continuous Best Practices)**: Adheres to modern state-of-the-art cloud and DevOps standards?
* **Rule 8 ($0 Cost / Bare Minimum Footprint)**: Resource limits explicit (max 200m CPU / 256Mi RAM), zero billing leak?
* **Rule 9 & 10 (System Governance)**: Control flow scoping and API contract preservation intact?
* **Rule 11 (Single Source of Truth - Architecture)**: Fully aligned with `docs/ARCHITECTURE.md`?
* **Rule 12 (Continuous Alignment Loop)**: Continuous alignment loop executed before commits?
* **Rule 13 (Proactive Skill Creation & Skill-Driven Development)**: Driven by specialized agent skills under `.agents/skills/`?

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
