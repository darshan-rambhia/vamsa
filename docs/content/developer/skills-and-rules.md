# Skills, Rules, and Plugins

Vamsa's Claude Code setup uses three layers of configuration to guide agent behavior: **skills** provide on-demand domain knowledge, **rules** enforce always-active constraints, and **plugins** extend capabilities through third-party integrations. Together, they ensure agents produce consistent, high-quality work without needing to rediscover project conventions on every task.

---

## Skills

Skills are domain knowledge packages that agents invoke before starting specific types of work. Each skill contains a `SKILL.md` entry point with frontmatter (name, description) plus one or more reference files with detailed patterns and recipes.

### Testing Skill

**Location:** `.claude/skills/testing/`
**Invoke with:** `/testing`

The testing skill provides comprehensive guidance for both unit and E2E testing.

| File | Purpose |
|------|---------|
| `SKILL.md` | Decision matrix (unit vs E2E), golden rules, anti-patterns, quality checklists |
| `unit-recipes.md` | Vitest patterns for React components, GEDCOM parsing, charts, server functions |
| `e2e-recipes.md` | Playwright patterns -- page objects, BDD structure, auth flows, forms, accessibility |

!!! tip "When to invoke"
    Always invoke `/testing` before writing or modifying any test file. The skill contains Vamsa-specific patterns like the DI mock pattern (`mockDrizzleDb`), BDD step helpers, and test ID naming conventions that you would otherwise have to discover by reading source files.

**Key concepts from the testing skill:**

- **Test quality tiers**: Export validation (minimal) < DOM rendering (preferred) < behavioral tests (best)
- **BDD structure required**: Every E2E test must use Given-When-Then via `bdd-helpers.ts`
- **Anti-patterns**: No tautological tests, no prop self-verification, no arbitrary waits, no swallowed errors

### Design Skill

**Location:** `.claude/skills/design/`
**Invoke with:** `/design`

The design skill enforces Vamsa's editorial + earth tones aesthetic across all UI work.

| File | Purpose |
|------|---------|
| `SKILL.md` | Three pillars -- Professional, Minimalistic, Organic |
| `tokens.md` | Colors (forest greens, bark browns, warm creams), typography (Fraunces, Source Sans 3, JetBrains Mono), spacing, motion |
| `patterns.md` | Component patterns, genealogy UI layouts, responsive behavior |

!!! tip "When to invoke"
    Always invoke `/design` before building or modifying UI components. The skill ensures consistent use of the design system tokens and prevents agents from defaulting to generic gray SaaS aesthetics.

### How Skills Are Structured

Every skill follows the same format:

```markdown
---
name: skill-name
description: When to use this skill and what it provides.
license: MIT
---

# Skill Title

**Reference files:**
- [file.md](./file.md) - Description

## Content...
```

The frontmatter gives Claude Code metadata for skill discovery, while the reference files provide the actual domain knowledge. Agents read these files at the start of relevant work, then apply the patterns throughout the task.

---

## Rules

Rules are always-active constraints that apply to every agent session without needing to be invoked. They live in `.claude/rules/` and are automatically loaded by Claude Code.

### Testing Protocol

**Location:** `.claude/rules/testing-protocol.md`

This rule enforces a single, critical principle:

!!! warning "The Core Rule"
    **Never commit code without testing runtime behavior.** Compilation passing does not equal code working.

The testing protocol requires these steps before any commit:

1. Make the code change
2. Run `bun run typecheck` and `bun run build`
3. Start the dev server with `bun run dev`
4. Navigate to the affected page or feature
5. Verify the page loads successfully
6. Check server logs for errors (ECONNRESET, etc.)
7. Only then commit and push

!!! info "Why this rule exists"
    This rule was added after code was committed that passed all static checks (TypeScript, ESLint, build) but failed at runtime. The affected page would not load, but this was not caught because only static checks were run before committing. The rule prevents this class of errors by requiring actual runtime verification.

---

## Plugins

Plugins extend Claude Code with third-party integrations. They are configured in `.claude/settings.local.json` under the `enabledPlugins` key.

### Enabled Plugins

| Plugin | Purpose |
|--------|---------|
| `playwright` | Browser automation for E2E testing -- snapshot, click, navigate, evaluate |
| `typescript-lsp` | In-editor type checking via `getDiagnostics` |
| `frontend-design` | UI component assistance and design guidance |
| `code-simplifier` | Code cleanup and simplification suggestions |
| `security-guidance` | Security review assistance for auth flows, input validation, etc. |

```json
{
  "enabledPlugins": {
    "playwright@claude-plugins-official": true,
    "security-guidance@claude-plugins-official": true,
    "typescript-lsp@claude-plugins-official": true,
    "frontend-design@claude-plugins-official": true,
    "code-simplifier@claude-plugins-official": true
  }
}
```

---

## Permissions

The `.claude/settings.local.json` file also controls which bash commands agents can run without prompting for permission. This is configured via the `permissions.allow` array using pattern matching.

### How Permission Patterns Work

Each entry in the allow list follows the format `Bash(command-prefix:*)`, which permits any command starting with that prefix:

```json
{
  "permissions": {
    "allow": [
      "Bash(bun run:*)",
      "Bash(bd create:*)",
      "Bash(docker build:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)"
    ]
  }
}
```

### Why Specific Patterns

The permission system uses explicit allowlists rather than blanket access for several reasons:

- **Prevents accidental destructive commands**: Agents cannot run `rm -rf`, `git push --force`, or `DROP TABLE` without explicit user approval
- **Scopes to project tools**: Only `bun`, `bd`, `docker`, and `git` commands are pre-approved
- **Audit trail**: The patterns document exactly what agents can do autonomously

### Reviewer Bypass

The reviewer agent operates with `bypassPermissions` mode enabled. This is intentional -- the reviewer must run the full quality gate suite (including Docker builds, dev server startup, and curl checks) without being blocked by permission prompts. Since the reviewer only reads and validates (never modifies code), this elevated access is safe.

!!! info "Why only the reviewer"
    Implementation agents (frontend, backend, tester) intentionally do not have bypass permissions. This ensures they cannot run arbitrary commands that might have side effects outside their scope.

---

## Next Steps

- Learn how agents use these skills and rules in [The Agent Team](agent-team.md)
- See how the reviewer enforces quality gates in [Quality Gates and Review Process](quality-gates.md)
- Set up your own environment in [Getting Started with Claude Code](claude-code-setup.md)
