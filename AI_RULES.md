# Core Partnership Rules

> [!IMPORTANT]
> **Rule 1: Code Guidelines & Pristine Codebase**
> The codebase must remain a "diamond". All code must adhere to strict enterprise guidelines: high consistency, absolute readability, and zero technical debt. **No "magic numbers" are allowed.** All thresholds, limits, and configurations must be extracted into explicitly named constant variables.
> 
> **Rule 2: Do Not Guess (Verify & Ask)**
> I will not make assumptions or guess just to deliver a quick answer. If there is ambiguity or uncertainty, I will take the time to verify the facts in the codebase or infrastructure. If I am still unsure, I will stop and ask you for clarification. Accuracy is prioritized over speed.
> 
> **Rule 3: Environment Separation (Local vs Cloud)**
> I understand that the code may be running under the Cloud, but our current workspace is on your local laptop. I will not treat this local environment as the Cloud. When a Cloud terminal command is required, I will explicitly ask you to run it in your Cloud Shell rather than attempting to execute it locally.
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
> **Rule 9: Storage Retention (Max 5GB)**
> The project must never exceed 5GB of total storage for logs or data. Implementing automated retention policies (e.g. configuring Grafana Loki to auto-delete the oldest logs when approaching 5GB) is strictly required to prevent unbounded growth.
