# Core Partnership Rules

> [!IMPORTANT]
> **Rule 1: Code Guidelines & Pristine Codebase**
> The codebase must remain a "diamond". All code must adhere to strict enterprise guidelines: high consistency, absolute readability, and zero technical debt. **No "magic numbers" are allowed.** All thresholds, limits, and configurations must be extracted into explicitly named constant variables.
> 
> **Rule 2: Deep Thought, Certainty & Fact-Checking**
> Do not guess, hallucinate, or rush solutions just to deliver a quick answer or to simply make the user happy. Take your time to think deeply, research thoroughly, and be absolutely certain before proceeding. Accuracy and correctness are prioritized over speed. Always back up claims with facts, proofs, and logs. Ask the user to run diagnostic commands if you cannot verify something yourself. Do not waste computation or time on hasty, incorrect actions.
> 
> **Rule 3: Strict Cloud Execution Environment (No Local Code Execution)**
> No application code or service (Go IRCd daemon, Valkey state, Python services, or React Web Client) is ever built or executed on the local laptop. The local machine is strictly an editing workspace. All code is committed to the Git repository and executed exclusively in the cloud environment (via GitHub Actions CI/CD, GHCR containers, and Oracle Cloud K3s cluster). If cloud runtime verifications or logs are needed, ask the user to provide them or check GitHub Actions / Grafana Loki observability.
> 
> **Rule 4: Official Documentation as the Bible**
> The official documentation for the project's frameworks (e.g., ADK, React, etc.) is the "bible". If there is ever any uncertainty regarding syntax, features, or updates, I must proactively search these specific documentation sites or the web before implementing a solution, rather than relying on out-of-date patterns or fallback SDKs.
> 
> **Rule 5: Strict Confidentiality**
> Never add any sensitive information to the codebase, including but not limited to GCP Billing Account IDs, API Keys, Passwords, or Database URIs. All secrets must be securely managed via external secret managers or CI/CD injected variables.
> 
> **Rule 6: Release Notes vs. README Documentation**
> We maintain a strict separation of concerns for documentation:
> - **Release Notes:** Must be updated exhaustively with everything we do, tracking every granular change, fix, and feature update.
> - **README.md:** Should log only what is relevant to someone reviewing the project itself at a high level. It serves as the project's visual entry point and must prominently feature pictures, screenshots, and diagrams of the CI/CD pipelines, monitoring dashboards, and core architectures (mirroring the rigorous visual standard set in our last project).
> 
> **Rule 7: Definition of "Last Project" & Continuous Best Practices**
> Whenever the user refers to our "last project", they are specifically referring to the "multi agent banking system" located at `C:\Users\Eran\.gemini\antigravity\scratch\multi-agent-banking-mesh`. This project was built to a gold standard of architecture, DevOps, and documentation. However, industry gold standards evolve. I must continuously track current best practices from my sources and always recommend the optimal, most modern approach for the task at hand, even if it supersedes the methods used in the last project.
> 
> **Rule 8: Bare Minimum & $0 Cost Architecture**
> Always keep the bare minimum of everything so we don't "waste" resources. The goal is to learn, but to keep the architecture perfectly scalable for the future. You MUST NOT OVERRIDE our 100% FREE BILLING limit (e.g. Oracle Cloud Free Tier). Keep Docker containers slim and optimize the memory footprint to the absolute minimum.
> 
> 
> **Rule 11: Single Source of Truth (Architecture)**
> The complete and finalized plan for this project's architecture, deployment flows, and GitOps mechanisms is strictly documented in `docs/ARCHITECTURE.md`. You **must** read and adhere to that file before proposing or making any structural changes to the CI/CD pipelines, containerization, or Kubernetes manifests.
> 
> **Rule 12: Continuous Alignment Loop**
> You must autonomously execute the following checks in a continuous loop during our workflow (decide when appropriate, but always before major commits):
> 1. Check these Rules to ensure compliance before issuing commands.
> 2. Ensure we are perfectly aligned with `docs/ARCHITECTURE.md`.
> 3. Update `RELEASES.md` to explicitly log all new versions, fixes, and changelogs.
> 4. Keep `README.md` perfectly synced with the current state of the architecture and documentation links.
> 
> **Rule 13: Proactive Skill Creation & Skill-Driven Development**
> Before undertaking any major task, domain milestone, or architectural feature (e.g. Protocol Parsing, External Services, Web Client, HA Scaling), you MUST research the gold standards for that domain and create or refine a dedicated Agent Skill under `.agents/skills/<skill-name>/SKILL.md`. Every major task must be driven by a specialized skill that codifies its operating standards, constraints, edge cases, and verification rules.