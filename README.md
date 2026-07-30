<div align="center">
  <img src="logo.png" alt="IRC Chat Logo" width="200"/>
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

## 🚀 Environments
1. **Test Environment (1 Node):** Internal testing and load verification.
2. **Production Environment (2 Nodes):** High-Availability active-active cluster with 100% uptime via rolling restarts.

## 📖 Documentation
- [Implementation Plan](IMPLEMENTATION_PLAN.md) - The detailed DevOps and Architectural strategy.
- [AI Rules](AI_RULES.md) - The strict coding and operational constraints for this repository.
