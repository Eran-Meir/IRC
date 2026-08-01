---
name: skill-creator
description: Meta-Skill for designing, building, validating, and optimizing AI Agent Skills for the IRC codebase. Triggers when creating new skills, updating workflows, or establishing pair-programming best practices.
---

# Skill Creator & Optimization Engine

## Purpose & Scope
This meta-skill defines the gold-standard methodology for authoring, evaluating, and maintaining AI agent skills within the codebase. It ensures every skill is modular, actionable, self-contained, and aligned with project rules.

## Anatomy of a Gold-Standard Skill
Every skill must reside under `.agents/skills/<skill-name>/` and contain a `SKILL.md` file adhering to the following structure:

```yaml
---
name: <kebab-case-name>
description: <Clear 1-2 sentence trigger statement defining WHAT the skill does and WHEN the agent should activate it>
---
```

### Core Design Rules
1. **Concise & Direct**: Keep `SKILL.md` body focused on core execution principles (under 500 lines). Move extensive reference material, scripts, or examples into subdirectories (`references/`, `scripts/`, `examples/`).
2. **Explicit Constraints**: Clearly list hard rules, forbidden practices, and mandatory verification steps.
3. **Project Rule Alignment**: Cross-reference relevant `AI_RULES.md` items (e.g. zero magic numbers, zero secret hardcoding, release note tracking).

## Skill Creation Workflow
1. **Identify Pattern**: Recognize repeated workflows, domain specializations (DevOps, Go IRCd Architecture, Frontend Client), or architectural guidelines.
2. **Draft `SKILL.md`**: Define frontmatter, core operating standards, verification rules, and checklist requirements.
3. **Validate Alignment**: Verify that instructions do not conflict with `AI_RULES.md` or `docs/ARCHITECTURE.md`.
4. **Register**: Store under `.agents/skills/<skill-name>/SKILL.md` for automatic agent discovery.
