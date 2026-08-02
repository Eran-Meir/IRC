<div align="center">
  <img src="assets/logo.png" alt="IRC Chat Logo" width="200"/>
  <h1>Modern Enterprise IRC Network</h1>
  <p>A highly-scalable, 100% free, Kubernetes-native IRC daemon and web client built for the modern cloud.</p>
</div>

---

## 🏗 Architecture
This project is built to the absolute gold standard of GitOps and Cloud-Native engineering, adhering strictly to a $0 resource footprint (Rule 8).

- **Core Daemon:** Go (Golang) - Highly concurrent, lightweight memory footprint.
- **Services:** Python - Externalized NickServ/ChanServ logic.
- **Client:** React + TypeScript - A web-based, mIRC-styled frontend.
- **State Backend:** Valkey - Distributed in-memory Pub/Sub for cross-node messaging.
- **Infrastructure:** Oracle Cloud (Ampere A1 ARM64) via Terraform.
- **Orchestration:** `k3s` (Lightweight Kubernetes).
- **CI/CD:** GitHub Actions -> ArgoCD (GitOps).
- **Observability:** Prometheus, Grafana, and Loki (Chat Moderation Logging).

### CI/CD Deployment Flow
```mermaid
graph TD
    Developer((Developer)) -->|Push / PR| GitHub[GitHub Repository]
    
    subgraph Infra ["Infrastructure Lifecycle (Manual Only)"]
        GitHub -->|Manual Trigger| ProvTest[Provision Test Env<br/>Terraform + ArgoCD + Monitoring]
        GitHub -->|Manual Trigger| DestTest[Destroy Test Env<br/>Wipes Cluster & Monitoring]
    end

    subgraph App ["Application Lifecycle (GitOps)"]
        GitHub -->|Manual Trigger| DepTest[3. Deploy Code to Test Env<br/>Build & Update Manifest]
        DepTest --> ArgoCD[ArgoCD Syncs Automatically]
        GitHub -->|Manual Trigger| StressTest[4. Stress Test Test Env<br/>50 Client Load Generator]
        GitHub -->|Manual Trigger| DepProd[5. Deploy Code to PROD Env<br/>Strictly Manual]
    end
```

## 🚀 Environments
1. **Test Environment (1 Node):** Internal testing and load verification.
2. **Production Environment (2 Nodes):** High-Availability active-active cluster with 100% uptime via rolling restarts.

## 📖 Documentation
- [Architecture & DevOps Plan](docs/ARCHITECTURE.md) - The detailed GitOps and infrastructure strategy.
- [AI Rules](AI_RULES.md) - The strict coding and operational constraints for this repository.
- [Release History](RELEASES.md) - Changelog for all deployments and feature rollouts.
