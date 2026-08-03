# Release History

## v0.5.1-alpha (Test Environment Ingress Routing & Multi-Stage Web Client Container)
* **DevOps & Routing Architecture**
  * Configured Grafana test monitoring service to listen on port `3001` (`http://<SERVER_IP>:3001`).
  * Created multi-stage `client/Dockerfile` (Node 20 Vite builder + ultra-slim Nginx runtime).
  * Created Traefik Ingress routing `http://<SERVER_IP>/test` directly to the `ircd-web-client` container with SPA fallback.
  * Configured Nginx WebSocket proxy forwarding `/ws` traffic to `ircd.default.svc.cluster.local:9090`.

## v0.5.0-alpha (Core IRC Messaging, Valkey Pub/Sub & mIRC React Web Client)
* **IRCd Engine Features**
  * Implemented RFC 1459 command router (`NICK`, `USER`, `JOIN`, `PART`, `PRIVMSG`, `PING`, `PONG`, `QUIT`).
  * Integrated Valkey Pub/Sub state backend for real-time cross-pod message broadcasting (`irc:channel:*`).
  * Built a pure Go RFC 6455 WebSocket upgrader (`/ws`) allowing web browsers to connect to IRCd without third-party dependencies.
* **Frontend Web Client (`client/`)**
  * Created modern mIRC-inspired React + TypeScript Web Client with `"Fixedsys"` font and dark mode glassmorphism themes.
  * Integrated English UI with Hebrew character reading support (auto-RTL text alignment for Hebrew messages).
  * Added top "View & Preferences" menu bar with customizable font size, font family, theme switcher, and nick list toggles.

## v0.4.4-alpha (Full Codebase Review & GitOps Documentation Architecture)
* **Documentation & Architecture**
  * Completed full codebase and infrastructure review using the `code-review` skill audit methodology.
  * Enhanced `README.md` with an extensive Enterprise GitOps & High-Performance Deployment Architecture section.
  * Documented multi-stage Docker build optimizations, declarative ArgoCD/Helm GitOps syncs, automated GHCR image pruning (4 tags max), and S3 state backups.

## v0.4.3-alpha (Prometheus Resource Headroom & OOM Prevention)
* **DevOps & Stability**
  * Increased Prometheus memory limit to `768Mi` in `kube-prometheus-stack.yaml` to prevent OOMKilled pod crashes during TSDB WAL compaction.
  * Optimized global cluster `scrapeInterval` to `15s` while preserving `5s` high-resolution scraping in `podmonitor.yaml` specifically for IRCd.

## v0.4.2-alpha (PromQL Metric Aggregation Fix for Active Connections)
* **DevOps & Dashboard Fix**
  * Updated PromQL target query in `dashboard-master.yaml` and `dashboard-app.yaml` to `sum(ircd_connected_clients) or vector(0)`.
  * Aggregates multi-instance Prometheus series into a single scalar value, resolving Grafana stat panel column splitting (`0 0 50`) into one clean unified count.

## v0.4.1-alpha (High-Resolution 5s Metric Scraping & PodMonitor)
* **DevOps & Metric Discovery**
  * Created `services/ircd/deploy/podmonitor.yaml` (`PodMonitor` Custom Resource) to instruct Prometheus Operator to scrape `:9090/metrics` directly from `ircd` pods.
  * Configured high-resolution `scrapeInterval: 5s` in `kube-prometheus-stack.yaml` to capture short-lived load spikes and sub-minute connection bursts.
  * Set `podMonitorSelectorNilUsesHelmValues: false` so Prometheus Operator automatically discovers application monitors without label constraint blocks.

## v0.4.0-alpha (Native IRCd Prometheus Metrics & Connection Tracking)
* **Application Metrics & Observability**
  * Added native Prometheus Exposition HTTP server (`:9090/metrics`) inside `services/ircd/internal/metrics/metrics.go` with zero external dependencies.
  * Implemented `ircd_connected_clients` gauge tracking active IRC client TCP sockets in real time (increments on connect, decrements on disconnect).
  * Implemented `ircd_messages_total` counter tracking processed IRC protocol messages.
  * Updated Grafana panels to display `ircd_connected_clients`, reading exact client counts (`0` when idle, `50` during stress test, `0` post-test).

## v0.3.1-alpha (Grafana Dashboard Units & Unified Master Grid)
* **DevOps & Dashboard Polish**
  * Added human-readable Grafana unit formatting (`decbytes`, `Bps`, `percent`, `short`) across all dashboard panels, converting raw bytes into clean MB/GB and Bps into KB/s.
  * Replaced static pod count metrics in TCP connection panels with live established socket metric `sum(node_netstat_Tcp_CurrEstab)`.
  * Unified the Master System Overview dashboard (`dashboard-master.yaml`) to show Server Node CPU/Memory/Load, App CPU/Memory, Valkey RAM, Network Bandwidth, and Loki chat logs in a single grid layout.

## v0.3.0-alpha (Automated High-Concurrency Stress Testing Suite)
* **DevOps & Testing**
  * Built dedicated load generator script `scripts/stress_test.py` utilizing Python `asyncio` to manage 50+ concurrent TCP connections.
  * Created dedicated manual workflow `.github/workflows/5-stress-test-test-env.yml` (`5. Stress Test - Test Environment`).
  * Configured automatic GitHub Step Summary markdown table output detailing total inbound messages, message throughput rates, and outbound fan-out reads.

## v0.2.2-alpha (Observability Datasource & True GitOps Alignment)
* **DevOps & Observability**
  * Configured explicit Prometheus datasource UID and bindings across all Grafana dashboards (`dashboard-master.yaml`, `dashboard-server.yaml`, `dashboard-app.yaml`).
  * Aligned monitoring stack with Rule 11 (True GitOps Architecture), removing brittle inline `kubectl patch` SSH string manipulations from `3-deploy-and-test-app.yml`.
  * Configured standard `kube-prometheus-stack` Helm wiring for native Grafana-Prometheus cluster DNS service discovery (`http://kube-prometheus-stack-prometheus.monitoring:9090`).

## v0.2.1-alpha (Security Audit & CI/CD Hardening)
* **Security & Compliance**
  * Performed security audit to ensure 100% compliance with Rule 5 (Strict Confidentiality).
  * Added root `.gitignore` to prevent sensitive credentials (`*.pem`, `*.key`, `deploy_key`, `*.tfstate`) from ever being committed.
  * Extracted hardcoded Grafana admin credentials in `kube-prometheus-stack.yaml` to Kubernetes `adminExistingSecret`.
* **DevOps & CI/CD**
  * Upgraded all GitHub Actions (`checkout`, `setup-terraform`, `docker/*`, `artifact/*`, `ghcr-prune`) to modern major versions targeting Node 24.
  * Added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` to eliminate all runtime deprecation warnings.
  * Resolved Oracle Cloud Ubuntu `iptables FORWARD` chain REJECT rule in `cloud-init.yaml`.
  * Added robust connection retry loop and multi-keyword banner matching in integration smoke test (`test.py`).

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
