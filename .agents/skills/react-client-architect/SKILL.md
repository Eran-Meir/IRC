---
name: react-client-architect
description: Lead Frontend Architect for the mIRC-styled React + TypeScript Web Client. Triggers when building, styling, or refactoring the frontend web client in client/.
---

# React + TypeScript Web Client Architect Skill

## Core Engineering Rules

This skill governs the development of the mIRC-inspired modern web client per `docs/ARCHITECTURE.md` (Section 7) and web development design aesthetics guidelines.

### 1. Aesthetic Excellence & Rich Design
- **Theme**: Sleek dark mode / glassmorphism aesthetic inspired by classic mIRC retro layouts elevated to modern standards.
- **Typography & Colors**: Modern typography (Inter/Roboto), rich CSS gradients, HSL tailored color palettes, zero default browser colors.
- **Micro-Animations**: Smooth hover states, dynamic channel tabs, unread message badges, smooth scroll.

### 2. Technical Stack
- React + TypeScript + Vite.
- Vanilla CSS / CSS Modules (no Tailwind unless explicitly requested).
- WebSocket connection to IRCd gateway / backend with auto-reconnect.

### 3. Component Architecture
- Single source of truth for channel state, query windows, user lists, and server logs.
- Pure components, zero unhandled errors, strict TypeScript prop validation.
