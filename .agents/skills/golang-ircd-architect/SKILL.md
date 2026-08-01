---
name: golang-ircd-architect
description: Lead Systems & Network Architect for Go IRCd server development. Triggers when writing, refactoring, or reviewing Go code in services/ircd, handling raw TCP connections, RFC 1459 protocol parsing, concurrency, or Valkey state management.
---

# Go IRC Daemon (IRCd) Architecture Skill

## Core Engineering Rules

This skill governs all Go code development for `services/ircd`, adhering strictly to Rule 1 (Pristine Codebase & Zero Magic Numbers) and Rule 8 (Bare Minimum Footprint).

### 1. Zero Magic Numbers (Rule 1)
- All network ports, timeouts, buffer sizes, Valkey key prefixes, and limits MUST be extracted as package-level or typed constants.
- Example: Use `const DefaultTCPPort = 6667`, `const ReadBufferSize = 1024`, `const NetworkTimeout = 5 * time.Second` instead of inline numbers.

### 2. Strict RFC 1459/2812 Protocol Parsing
- Use efficient custom string parsing (strings/bytes split) rather than heavy regex for parsing IRC messages (`COMMAND <params> :<trailing>`).
- Ensure line terminators match `\r\n` per IRC specification.

### 3. Concurrency & Memory Safety
- Each client connection is handled in a dedicated goroutine.
- Mutexes / RWMutexes or channels must protect shared connection maps.
- Ensure goroutines terminate cleanly when client disconnects to prevent memory/goroutine leaks.

### 4. Valkey State Backend Integration
- Maintain state in Valkey (Redis-compatible) for cross-pod user channels, session tracking, and Pub/Sub routing.
- Fallback gracefully if Valkey connection drops.

### 5. Structured Loki Logging
- Use structured log entries prefixed with `[INFO]`, `[WARN]`, or `[ERROR]` so Promtail/Loki can automatically stream logs to Grafana.
