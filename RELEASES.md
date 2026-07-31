# Release History

## v0.1.1-alpha (GitOps Migration)
* **DevOps & Architecture Correction**
* Migrated completely away from fragile `scp`/`ssh` deployment scripts.
* Implemented true GitOps deployment architecture using **ArgoCD**.
* Updated Terraform `cloud-init.yaml` to natively bootstrap ArgoCD upon cluster creation.
* Fixed critical port collision bug (`IRCD_PORT` vs Kubernetes injected variables).
* Implemented automated GitHub Container Registry (GHCR) pruning workflow to retain only 4 images, strictly adhering to $0 resource limits.
* Established unified `docs/ARCHITECTURE.md` as the single source of truth.

## v0.1.0-alpha (Current)
* **DevOps Focus**
* Implemented raw TCP Socket Connection Manager.
* Integrated Valkey state adapter for Pub/Sub capability.
* Built RFC 1459-compliant IRC Message Parser engine (No Regex).
* Created dedicated CLI test client (`cmd/client/main.go`).
* Stabilized 100% automated CI/CD pipeline deploying directly to K3s cluster.
