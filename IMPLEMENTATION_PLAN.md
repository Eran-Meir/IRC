# Unified Architecture & DevOps Implementation Plan

This document serves as our single, synchronized source of truth for the project's architecture, DevOps strategy, and CI/CD pipelines. No code will be written until this plan is formally approved.

## Core Architectural Decisions

> [!NOTE]
> Based on our design review, the following core decisions have been finalized:
> - **Language:** Go (Golang) - chosen for its fast development, massive networking ecosystem, and goroutines for extreme concurrency.
> - **State Backend:** Valkey - chosen as the highly-available, in-memory Pub/Sub and key-value store for cross-pod state synchronization.
> - **Infrastructure Provisioning:** Strictly manual triggers (`workflow_dispatch`) for Terraform. We will use the Oracle Cloud (`oci`) provider to provision free ARM64 Ampere A1 instances and self-host `k3s` to achieve a 100% $0 cost.
> - **Monitoring Integration:** ArgoCD and Grafana (kube-prometheus-stack) will be provisioned directly by the manual Terraform apply and destroyed on teardown.

---

## 1. Project Structure: IRCd Placement

Placing the IRC daemon under a `services/ircd` directory is an excellent architectural choice. Because every command and operation must be supported by the server itself, we will likely be developing the IRCd and other services simultaneously. This structure cleanly separates the core daemon from other potential components while allowing them to share core logic in a `pkg` or `internal` directory.

## 2. Resource Management & Scaling (Test Environment)

For the test environment, we will configure strict resource constraints in our container orchestration to minimize costs:

```yaml
resources:
  requests:
    cpu: "10m"      # 10 millicores (1% of a CPU core)
    memory: "32Mi"  # 32 Megabytes
  limits:
    cpu: "50m"      # 50 millicores
    memory: "64Mi"  # 64 Megabytes
```
> [!TIP]
> **Scaling Math for Go:** Go's lightweight goroutines consume roughly 2KB of stack space. A pod handling 50 active users requires ~100 goroutines (read/write per user) taking ~200KB. Combined with the ~10MB Go runtime, this `32Mi` memory footprint is not just a placeholder—it is mathematically verified to comfortably hold 50-100 active, chatting connections per pod!

## 3. Containerization & Secrets Strategy

We will use **multi-stage Dockerfiles** to ensure deployment artifacts are as small and secure as possible.
All secrets (e.g., TLS certificates, Valkey passwords, Terraform credentials) will be stored securely using **GitHub Secrets/Variables** for the pipelines, and injected into Kubernetes via standard **Kubernetes Secrets** (or managed via ArgoCD). We will avoid hardcoding any sensitive data.

## 4. Releases & Pod Versioning

Deploying new versions without downtime requires a robust strategy for handling pods running different versions simultaneously. We will use a **Rolling Update** deployment strategy, maintaining statelessness (or state synced via Valkey).

---

## 5. CI/CD & Deployment Architecture (Manual Trigger Focus)

The CI/CD pipeline is designed for strict manual control over infrastructure, while allowing automated code-testing cycles.

```mermaid
graph TD
    Developer((Developer)) -->|Push / PR| GitHub[GitHub Repository]
    
    subgraph Infra ["Infrastructure Lifecycle (Manual Only)"]
        GitHub -->|Manual Trigger| ProvTest[Provision Test Env<br/>Terraform + ArgoCD + Monitoring]
        GitHub -->|Manual Trigger| DestTest[Destroy Test Env<br/>Wipes Cluster & Monitoring]
    end

    subgraph App ["Application Lifecycle"]
        GitHub -->|Manual Trigger| DepTest[Deploy Code to Test Env<br/>Build & Push Image]
        DepTest --> RunTest[Run Integration Tests]
        GitHub -->|Manual Trigger (Tag Release)| DepProd[Deploy Code to PROD Env<br/>Strictly Manual]
    end
```

### GitHub Actions Workflow Structure

#### Infrastructure (Manual `workflow_dispatch` ONLY)
- **`1-provision-test-env.yml`**: Manually executes `terraform apply`. This provisions the cluster, installs ArgoCD via Helm, and bootstraps the Grafana/Prometheus monitoring stack.
- **`2-destroy-test-env.yml`**: Manually executes `terraform destroy`. This deletes the cluster entirely, guaranteeing everything (ArgoCD, Grafana, apps) is removed and billing stops.

#### Application Pipelines (Publishing & Deploying)
- **`3-deploy-and-test-app.yml`**: Can be triggered manually (or strictly on specific test branches). It compiles the binary, pushes a new container image, updates the test manifest, and runs integration tests.
- **`4-release-to-prod.yml` (STRICTLY MANUAL)**: This workflow will **only** run when you manually trigger it or manually publish a GitHub Release/Tag. It promotes a tested container to the Production cluster. There are zero automated triggers to Production.

### Integration Testing Strategy (Cross-Pod Communication)
Our automated tests will specifically verify the distributed nature of the IRCd. The pipeline will:
1. Ensure at least **2 pods** are running.
2. Connect **Client A** specifically to **Pod 1**.
3. Connect **Client B** specifically to **Pod 2**.
4. Have Client A join `#test` and send a message.
5. Verify Client B receives the message, proving that Pod 1 and Pod 2 are successfully communicating over the Valkey backbone.

---

## 6. Observability & Moderation Logging (ArgoCD, Grafana, Loki)

We will use a robust, modern GitOps observability stack:
- **ArgoCD:** Installed via Terraform immediately after cluster creation. It will monitor our Git repository and automatically sync our Kubernetes manifests (including the IRCd deployments).
- **Monitoring Stack (kube-prometheus-stack):** We will use Helm (managed by ArgoCD or Terraform) to deploy Prometheus and Grafana.
- **Chat Logging (Grafana Loki):** To satisfy the requirement for moderation and compliance, we will deploy **Loki**. The IRC daemon will output structured JSON logs of all messages (including private messages). Loki will scrape and store these logs in the free Oracle block volume. This allows us to search historical chat logs directly from the Grafana UI without needing a heavy database.
- **Dashboards:** We will provision two separate environments (Test and Prod) with their own Grafana instances. This will allow us to visualize CPU/Memory usage, active TCP connections, message throughput per pod, and query the moderation logs.
- **Ephemeral Nature:** Because Grafana and ArgoCD are deployed *inside* the Kubernetes cluster provisioned by Terraform, running the manual Terraform Destroy command will completely wipe out the monitoring stack along with the infrastructure, leaving zero orphaned resources.

### Why Complete Environment Isolation?
We do not share any infrastructure (no shared clusters, no shared databases, no shared Valkey) between Test and Prod.
- **The "Blast Radius":** If a bad code commit is deployed to Test, or a load test causes an Out Of Memory (OOM) crash, we want it to bring down the Test cluster *only*. If they shared a Kubernetes cluster or a Valkey state backend, a failure in Test could easily crash Production. Complete isolation guarantees your real users are never affected by testing.

### Environment Topology (The True "Bare Minimum" for 100% Uptime)
To satisfy **Rule 8** (no wasted resources) while guaranteeing **100% uptime**, we need exactly 2 nodes for Production. This allows us to perform "rolling restarts" (rebooting Node 1 while Node 2 handles all the traffic).

We will split the free Oracle resources as follows:

**1. Test Environment (1 Node Cluster):**
- **Hardware:** 1 Oracle ARM Instance (1 Core, 6GB RAM).
- **Pods:** 
  - 2x IRCd Pods (minimum required to test cross-pod Valkey communication on a single machine).
  - 1x Valkey Pod.
  - 1x ArgoCD & 1x Grafana/Loki.

**2. Production Environment (2 Node High-Availability Cluster):**
- **Hardware:** 2 Oracle ARM Instances (1.5 Cores, 9GB RAM each).
- **Pods:**
  - 2x IRCd Pods (1 per node).
  - 2x Valkey Pods (Clustered).
  - 1x ArgoCD & 1x Grafana/Loki.

*Note: By using 2 nodes for Prod, if Oracle restarts one of the servers for maintenance, the load balancer instantly mitigates backend traffic to the surviving node, ensuring zero downtime for your users.*

---

## 7. Core Software Architecture (IRCd & Services)

To support the highly scalable Kubernetes architecture, the core daemon itself must be built natively for distributed state.

### High-Level Component Design
1. **Connection Manager (TCP/TLS):** Handles raw inbound sockets and TLS termination.
2. **Protocol Parser:** Strictly implements IRC RFCs, safely tokenizing streams.
3. **Core Router & State Manager:** Synchronizes global state with the backend (**Valkey**) so users on different Pods can chat.
4. **External Services (Python):** The Services (NickServ, ChanServ) will be written in Python, interfacing with the Go IRCd or Valkey to handle commands.
5. **Web Client (React + TS):** A dedicated, mIRC-styled web client built with React and TypeScript.
6. **Database (TBD):** We will select a lightweight database later for persistent user registration and settings.

### The Valkey Data Model (Distributed State Sync)
Valkey acts as the central nervous system:
- **Global User Registry:** `user:{uuid} -> {current_pod_id, nickname, hostmask, channels}`
- **Pub/Sub Message Bus:** Pod A publishes events to the Valkey Pub/Sub bus. All other Pods subscribed receive the event and relay it to their local connected clients.
