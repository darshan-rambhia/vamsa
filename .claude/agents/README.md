# Vamsa Claude Agents

This directory contains Claude Agent SDK configurations for the Vamsa Family Tree project. These agents work together to manage feature development from analysis through quality assurance.

## Agents Overview

### 1. **techlead.md** (Primary Agent)

- **Model**: `claude-opus-4-5-20251101`
- **Temperature**: 0.2
- **Permission Mode**: `acceptEdits`
- **Tools**: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, Task
- **Role**: Central coordinator for all development work
- **Responsibilities**:
  - Analyze feature requests
  - Explore codebase for patterns
  - Create epic and implementation beads
  - Present plans for user approval
  - Orchestrate subagent workflow
  - Coordinate issue resolution

### 2. **backend.md** (Subagent)

- **Model**: `claude-haiku-4-5-20251001`
- **Temperature**: 0.2
- **Permission Mode**: `acceptEdits`
- **Tools**: Read, Write, Edit, Bash, Glob, Grep
- **Role**: Server-side implementation
- **Responsibilities**:
  - Implement server actions
  - Create Zod schemas
  - Handle database migrations
  - Write API logic
  - Quality gates: typecheck, lint, build

### 3. **frontend.md** (Subagent)

- **Model**: `claude-opus-4-5-20251101`
- **Temperature**: 0.3
- **Permission Mode**: `acceptEdits`
- **Tools**: Read, Write, Edit, Bash, Glob, Grep
- **Role**: Client-side implementation
- **Responsibilities**:
  - Implement React components
  - Build pages and forms
  - Create shadcn/ui components
  - Handle user interactions
  - Quality gates: format, typecheck, lint, build

### 4. **tester.md** (Subagent)

- **Model**: `claude-haiku-4-5-20251001`
- **Temperature**: 0.2
- **Permission Mode**: `acceptEdits`
- **Tools**: Read, Write, Edit, Bash, Glob, Grep
- **Role**: Test writing and coverage verification
- **Responsibilities**:
  - Write unit tests (Bun test)
  - Write E2E tests (Playwright)
  - Verify coverage thresholds
  - Report test results
  - NEVER commit to git

### 5. **reviewer.md** (Subagent)

- **Model**: `claude-opus-4-5-20251101`
- **Temperature**: 0.1
- **Permission Mode**: `bypassPermissions`
- **Tools**: Read, Bash, Glob, Grep
- **Role**: Quality gatekeeper (ONLY agent authorized to close beads)
- **Responsibilities**:
  - Run all quality gates
  - Verify acceptance criteria
  - Check test coverage
  - Validate build succeeds
  - Close beads when all criteria met
  - Identify issues and reassign to responsible agent

## Development Workflow

### Phase 1: Feature Analysis

1. User requests feature
2. Tech Lead analyzes requirements
3. Tech Lead explores codebase
4. Tech Lead proposes solution

### Phase 2: Plan Approval

1. Tech Lead presents plan with beads
2. User reviews and approves
3. Tech Lead waits for "approved" response

### Phase 3: Implementation (Parallel)

1. Tech Lead delegates to @frontend and @backend
2. Both agents work independently
3. Agents report `ready` when complete

### Phase 4: Testing

1. Tech Lead invokes @tester
2. Tester writes comprehensive tests
3. Tester reports test coverage and passes

### Phase 5: Review & Completion

1. Tech Lead invokes @reviewer
2. Reviewer runs all quality gates
3. Reviewer either closes bead or identifies issues
4. If issues: Tech Lead reassigns to responsible agent
5. Agent fixes and reports ready
6. Reviewer re-checks and closes

## Bead Status Management

All agents follow this pattern:

```bash
# Confirm assignment
bd show {bead-id}
bd assign {bead-id} @agent

# Mark as in progress
bd status {bead-id} in_progress

# Work on the bead...

# Report completion
bd status {bead-id} ready
bd comment {bead-id} --body "Work complete. Quality gates: [status]"
```

## Quality Gates

### Backend Agent

```bash
bun run typecheck     # TypeScript checks
bun run lint          # ESLint validation
bun run build         # Production build succeeds
```

### Frontend Agent

```bash
bun run format        # Prettier formatting
bun run typecheck     # TypeScript checks
bun run lint          # ESLint validation
bun run build         # Production build succeeds
```

### Tester Agent

```bash
bun run test           # Unit tests pass
bun run test:coverage  # Coverage >= 90% statements, 85% branches
bun run test:e2e       # E2E tests pass
```

### Reviewer Agent

- Runs all backend quality gates
- Runs all frontend quality gates
- Runs all tester quality gates
- Verifies each acceptance criterion
- Checks for code quality issues

## Important Rules

1. **Beads are NEVER marked complete by the agent doing the work**
   - Only @reviewer can close beads
   - Agents report `ready` status
   - Tech Lead coordinates transitions

2. **Parallel work is safe**
   - @backend and @frontend can work simultaneously
   - Quality gates run sequentially (ensures clean state)

3. **Issue Resolution**
   - @reviewer identifies issues and assigns to responsible agent
   - Tech Lead facilitates reassignment
   - Agent fixes and reports ready
   - @reviewer re-checks and closes

4. **No Git Operations**
   - Only Tech Lead commits code
   - Other agents: NEVER use git commands
   - Tester specifically NEVER commits

## Stack Context

These agents work with:

- **Framework**: Next.js 15
- **Runtime**: Bun
- **Database**: Drizzle (PostgreSQL)
- **Auth**: NextAuth
- **State**: TanStack Query
- **UI**: React Flow, shadcn/ui
- **Testing**: Bun test, Playwright
- **Code Quality**: TypeScript, ESLint, Prettier
