# Release History

## v0.2.0-alpha (Observability & Monitoring Stack)
* **Infrastructure Focus**
* Deployed `kube-prometheus-stack` (Grafana & Prometheus) via ArgoCD GitOps, strictly tuned for memory efficiency and exposed via Port 3000 LoadBalancer.
* Deployed `loki-stack` (Loki & Promtail) via ArgoCD with strict 5GB storage limit and 7-day retention period.
* Updated `cloud-init.yaml` to securely open monitoring ports and automatically bootstrap observability manifests on cluster creation.
* Created custom GitOps `ConfigMap` for Grafana to dynamically provision a bespoke IRC daemon monitoring dashboard (CPU, Memory, Network Traffic, and Live Loki Chat Logs).


## v0.1.2-alpha (GitOps Verification Test)
* **DevOps Focus**
* Updated IRCd connection welcome banner to `[Build Version Y (GitOps Verified)]` to strictly test and verify end-to-end continuous deployment via ArgoCD.


## v0.1.1-alpha (GitOps Migration)
* **DevOps & Architecture Correction**
* Migrated completely away from fragile `scp`/`ssh` deployment scripts.
* Implemented true GitOps deployment architecture using **ArgoCD**.
* Updated Terraform `cloud-init.yaml` to natively bootstrap ArgoCD upon cluster creation.
* Fixed critical port collision bug (`IRCD_PORT` vs Kubernetes injected variables).
* Removed hardcoded `imagePullSecrets` manifest configuration to enable seamless anonymous pulls for public GHCR packages.
* Implemented automated GitHub Container Registry (GHCR) pruning workflow to retain only 4 images, strictly adhering to $0 resource limits.
* Established unified `docs/ARCHITECTURE.md` as the single source of truth.

## v0.1.0-alpha (Current)
* **DevOps Focus**
* Implemented raw TCP Socket Connection Manager.
* Integrated Valkey state adapter for Pub/Sub capability.
* Built RFC 1459-compliant IRC Message Parser engine (No Regex).
* Created dedicated CLI test client (`cmd/client/main.go`).
* Stabilized 100% automated CI/CD pipeline deploying directly to K3s cluster.
