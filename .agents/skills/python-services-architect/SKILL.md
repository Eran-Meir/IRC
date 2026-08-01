---
name: python-services-architect
description: Lead Architect for Python External IRC Services (NickServ, ChanServ, OperServ). Triggers when building, reviewing, or refactoring Python service scripts interfacing with the Go IRC daemon or Valkey state.
---

# Python External IRC Services Architect Skill

## Core Engineering Rules

This skill governs the development of Python external IRC services (NickServ, ChanServ) per `docs/ARCHITECTURE.md` (Section 7).

### 1. Separation of Concerns
- External services act as privileged IRC service bots connecting over local socket or Valkey state bus.
- Services handle registration, authentication, channel ownership, and operator privileges.

### 2. Code Quality & Type Hints
- All Python code must use strict type hints (`typing`), dataclasses, and standard `logging`.
- Zero magic constants: all command names, defaults, and timeouts must be defined as uppercase module constants.

### 3. Valkey Integration
- Use `redis-py` (compatible with Valkey) to query registered nicknames and passwords hashed via `bcrypt` / `argon2`.
- Store service state in Valkey hashes (`services:nickserv:account:<user>`).
