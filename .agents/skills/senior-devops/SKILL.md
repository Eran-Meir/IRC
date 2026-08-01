---
name: senior-devops
description: Senior DevOps & Infrastructure Automation Specialist for Oracle Cloud, K3s, Terraform, ArgoCD GitOps, Helm, Traefik HTTPS, and Prometheus/Loki Observability. Triggers when working on CI/CD workflows, cluster provisioning, Kubernetes manifests, ingress, or Grafana dashboards.
---

# Senior DevOps & Infrastructure Automation Skill

## Core Principles & Operating Standard

This skill governs all DevOps, Infrastructure-as-Code, and CI/CD operations for the IRC project, strictly aligning with `AI_RULES.md` (Rules 1, 3, 5, 8, 11, 12) and `docs/ARCHITECTURE.md`.

### 1. $0 Cost & Bare-Minimum Resource Allocation (Rule 8)
- Always operate strictly within Oracle Cloud Free Tier limits (Always Free ARM64 Ampere instance, 1 node, 6GB RAM, max 50GB storage).
- Container CPU request limits must remain under `200m` CPU / `256Mi` RAM per service to prevent node OOM events.
- GHCR image retention policy: Retain a maximum of 4 image tags via GitHub Actions pruning.

### 2. True GitOps Architecture (Rule 11)
- Never use manual `scp` or `ssh` binary copy deployments.
- All deployments must go through Git: GitHub Actions updates container tag in `services/ircd/deploy/deployment.yaml`, commits to `main`, and **ArgoCD** syncs the manifest to the cluster.
- ArgoCD polling timeout in CI smoke tests must be set to at least `300s` (5 minutes) to avoid race conditions with ArgoCD's default 3-minute poll interval.

### 3. Networking & Security Firewall Standards
- **VM Firewall**: Oracle Cloud Canonical Ubuntu images set `FORWARD` iptables chain to `REJECT` by default. `cloud-init.yaml` MUST include `iptables -P FORWARD ACCEPT` and `iptables -F FORWARD` to allow k3s container ingress and load balancer routing.
- **Ingress & TLS**: Grafana and web endpoints must use K3s built-in **Traefik Ingress Controller** with `ingress.kubernetes.io/ssl-redirect: "true"`. HTTP (port 80) requests must automatically 301-redirect to HTTPS (port 443).
- **Secrets Management (Rule 5)**: Never hardcode passwords or private keys in Git. Passwords (e.g. `GRAFANA_ADMIN_PASSWORD`) must be passed from GitHub Secrets into Terraform -> `cloud-init.yaml` -> Kubernetes Secret (`grafana-admin-secret`).

### 4. Observability & Monitoring Standard
Maintain 3 dedicated auto-importing Grafana dashboards in `services/ircd/deploy/`:
1. `dashboard-server.yaml`: Node CPU %, Memory, Network Bandwidth, System Load.
2. `dashboard-app.yaml`: Active TCP connections, container CPU/RAM, Valkey state RAM, Loki chat/system logs.
3. `dashboard-master.yaml`: Unified Executive Overview combining server health, app metrics, and live Loki logs.

### 5. CI/CD Action Hygiene
- Use modern major versions of GitHub Actions (`actions/checkout@v6`, `hashicorp/setup-terraform@v4`, `docker/login-action@v4`, `docker/build-push-action@v7`, `actions/upload-artifact@v6`).
- Include `env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` to prevent Node 20 deprecation warning annotations on runners.
- Integration smoke tests (`test.py`) MUST include retry loops (minimum 10 attempts, 3s delay) to allow network load balancer endpoints to stabilize.

### 6. Marvel Cinematic Universe (MCU) Release Codenames
All releases and container tags follow a chronological Marvel Cinematic Universe milestone progression:
- **Phase 1 (Foundation)**: `v0.1.0-ironman-mark1`, `v0.2.0-stark-tower`, `v0.3.0-avengers-assemble`
- **Phase 2 (Services & Web)**: `v0.4.0-age-of-ultron`, `v0.5.0-civil-war`
- **Phase 3 (Final Production Scale)**: `v1.0.0-endgame` (Production Launch)
