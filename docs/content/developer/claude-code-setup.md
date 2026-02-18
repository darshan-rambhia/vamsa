# Getting Started with Claude Code

This guide walks you through setting up your development environment to contribute to Vamsa using Claude Code. By the end, you will have the CLI installed, the project configured, and an understanding of how to interact with the agent team.

---

## Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Purpose | Install |
|------|---------|---------|
| [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) | AI-assisted development | `npm install -g @anthropic-ai/claude-code` |
| [Git](https://git-scm.com/) | Version control | System package manager |
| [Bun](https://bun.sh/) | JavaScript runtime and package manager | `curl -fsSL https://bun.sh/install \| bash` |
| [Docker](https://www.docker.com/) | Container runtime (for comprehensive reviews) | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |

!!! info "Why Bun?"
    Bun is non-negotiable for Vamsa. The project uses Bun workspaces, Bun's native TypeScript support, and Bun as the production server runtime. Do not substitute with Node.js or pnpm.

---

## Setup Steps

### 1. Clone the Repository

```bash
git clone https://github.com/darshan-rambhia/vamsa.git
cd vamsa
```

### 2. Install Dependencies

```bash
bun install
```

This installs dependencies for all packages in the monorepo workspace.

### 3. Verify the Setup

```bash
bun run check    # Runs lint, format, typecheck, and tests in parallel
bun run build    # Builds all packages for production
```

### 4. Open with Claude Code

```bash
claude
```

When you open the repository with Claude Code, it automatically loads the project instructions from `CLAUDE.md` at the repository root. This file tells Claude Code about the project structure, available commands, coding standards, and agent configurations.

---

## Directory Structure

The `.claude/` directory contains all agent configurations, skills, rules, and permissions:

```
.claude/
├── agents/                    # Agent definitions
│   ├── techlead.md           # Project coordinator - analyzes, plans, delegates
│   ├── backend.md            # Server functions, schemas, database
│   ├── frontend.md           # UI components, pages, styling
│   ├── tester.md             # Unit tests (Vitest) and E2E tests (Playwright)
│   ├── reviewer.md           # Quality gates - the ONLY agent that closes beads
│   └── README.md             # Agent team overview
├── commands/                  # Slash commands for autonomous loops
│   ├── techlead-loop.md      # /techlead-loop - autonomous feature delivery
│   └── bead-loop.md          # /bead-loop - batch bead processing
├── hooks/                     # Stop hooks for autonomous loops
│   ├── techlead-loop-stop.md # Exit conditions for tech lead loop
│   └── bead-loop-stop.md     # Exit conditions for bead loop
├── rules/                     # Always-active constraints
│   └── testing-protocol.md   # "Never commit without testing runtime behavior"
├── skills/                    # On-demand domain knowledge
│   ├── testing/              # Vitest + Playwright patterns
│   │   ├── SKILL.md          # Entry point with decision matrix
│   │   ├── unit-recipes.md   # Unit test recipes by domain
│   │   └── e2e-recipes.md    # E2E test recipes and page objects
│   └── design/               # UI design system
│       ├── SKILL.md          # Three pillars: Professional, Minimalistic, Organic
│       ├── tokens.md         # Colors, typography, spacing, motion
│       └── patterns.md       # Component patterns and layouts
└── settings.local.json        # Permissions and plugin configuration
```

!!! tip "The key files"
    The two most important files for understanding the project are `CLAUDE.md` (project-wide instructions) and `.claude/agents/README.md` (agent team overview). Start there if you want to understand how Vamsa's AI-assisted development works.

---

## How to Invoke Agents

Agents are specialized subagents spawned by the Tech Lead to handle specific types of work. In practice, you typically interact with the Tech Lead, who delegates to the appropriate agent.

### Through the Tech Lead

The most common workflow is to describe what you need, and the Tech Lead coordinates:

```
You: "Add a search feature to the people list page"
Tech Lead → analyzes codebase → creates beads → delegates to @backend and @frontend
```

### Direct Agent Invocation

You can also invoke agents directly via the Task tool:

```
@frontend "Implement the PersonCard component with hover states"
@backend "Add a server function for fuzzy person search"
@tester "Write unit tests for the GEDCOM parser"
@reviewer "Review bead oxco-1234"
```

---

## Using Slash Commands

Slash commands launch autonomous development loops that coordinate multiple agents through complete feature delivery.

### `/techlead-loop`

Autonomous feature delivery from idea to committed code:

```bash
/techlead-loop "Add email notifications when users make suggestions" --max-iterations 50
```

The Tech Lead will:

1. Analyze the feature request and explore the codebase
2. Create an epic with implementation beads
3. Present a plan for your approval
4. Delegate to backend, frontend, and tester agents
5. Send completed work to the reviewer
6. Loop until all quality gates pass and the bead is closed

### `/bead-loop`

Batch processing of multiple beads:

```bash
/bead-loop --filter "Port" --max-iterations 100
```

The Tech Lead iterates through open beads matching the filter, enriching each with implementation details and delegating to the appropriate agents.

### `/testing`

Invoke the testing skill before writing tests:

```bash
/testing
```

This loads Vitest patterns, Playwright recipes, BDD helpers, and anti-patterns into the agent's context.

### `/design`

Invoke the design skill before building UI:

```bash
/design
```

This loads Vamsa's earth tone palette, typography tokens, component patterns, and layout guidance.

---

## Using Skills

Skills provide context and patterns that agents use to produce consistent, high-quality work. They are not commands that execute anything -- they are knowledge packages that inform how agents approach tasks.

### When to Invoke

- **Before writing any test**: Invoke `/testing` to load Vitest patterns, BDD structure requirements, and anti-patterns
- **Before building any UI**: Invoke `/design` to load the design system tokens, component patterns, and layout guidance

### What Skills Provide

=== "Testing Skill"
    - Decision matrix: when to use unit tests vs E2E tests
    - Vitest patterns for React components, GEDCOM parsing, charts, server functions
    - Playwright patterns: page objects, BDD steps, auth flows, forms, accessibility
    - Anti-patterns to avoid (tautological tests, arbitrary waits, swallowed errors)
    - Quality checklists for both unit and E2E tests

=== "Design Skill"
    - Three pillars: Professional, Minimalistic, Organic
    - Color tokens: forest greens, bark browns, warm creams
    - Typography: Fraunces (display), Source Sans 3 (body), JetBrains Mono (mono)
    - Spacing and motion values
    - Component patterns for genealogy UI (person cards, family trees, timelines)

---

## Permission Prompts

Claude Code asks for permission before running bash commands that are not pre-approved. The pre-approved patterns are defined in `.claude/settings.local.json`.

### Pre-approved Commands

Common commands that run without prompting:

- `bun run *` -- all project scripts (dev, build, test, lint, etc.)
- `bd *` -- all bead CLI commands (create, list, show, close, etc.)
- `docker *` -- Docker build, run, stop, etc.
- `git add *`, `git commit *` -- version control operations

### When You Get Prompted

If Claude Code asks for permission to run a command, you can:

1. **Approve once** -- allow this specific invocation
2. **Approve the pattern** -- add it to the allowlist for future runs
3. **Deny** -- block the command

!!! info "Reviewer permissions"
    The reviewer agent has `bypassPermissions` enabled because it needs to run the full quality gate suite (including Docker builds, dev server startup, and health checks) without interruption. This is safe because the reviewer only validates -- it never modifies source code.

---

## Tips for Effective Collaboration

1. **Start with the Tech Lead for new features.** Describe what you want at a high level and let the Tech Lead break it down into beads with clear acceptance criteria.

2. **Use beads to track work.** Run `bd ready` to see what beads are available for work. Beads provide structure that keeps agents focused and prevents scope creep.

3. **Let the autonomous loops run.** The `/techlead-loop` command handles coordination between agents, including retries when the reviewer finds issues. You do not need to manually manage handoffs.

4. **Read skill files before writing tests or UI.** The 30 seconds spent loading a skill saves minutes of rework from incorrect patterns.

5. **Trust the reviewer.** It runs comprehensive checks that catch integration issues, deployment problems, and coverage gaps that individual agents might miss.

6. **Check the testing protocol.** Before committing any code change, verify it works at runtime -- not just at compile time. Start the dev server and navigate to the affected page.

---

## Next Steps

- Understand the big picture in [Claude Code Overview](claude-code-overview.md)
- Meet the five specialized agents in [The Agent Team](agent-team.md)
- Learn about the task management system in [Beads Workflow](beads-workflow.md)
- Explore the autonomous loops in [Development Loops](development-loops.md)
