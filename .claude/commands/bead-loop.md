# /bead-loop Command

Autonomous bead-by-bead development loop. The Tech Lead iterates through open beads, enriches each with implementation details, delegates to appropriate agents, and orchestrates the complete workflow with comprehensive quality gates.

## Usage

```bash
/bead-loop [--filter "<query>"] [--max-iterations <n>] [--completion-promise "<text>"]
```

## Parameters

- `--filter "<query>"` - Filter beads (e.g., "Port" to work on migration beads, or specific bead ID)
- `--max-iterations <n>` - Maximum iterations before timeout (recommended: 100, prevents infinite loops)
- `--completion-promise "<text>"` - Signal text to exit loop (default: "BEAD_LOOP_COMPLETE")

## Example

```bash
/bead-loop --filter "Port" --max-iterations 100 --completion-promise "BEAD_LOOP_COMPLETE"
```

## How It Works

The Tech Lead processes beads one at a time in priority order:

### Phase 1: Bead Selection (Each Iteration Start)

1. **List available beads**: `bd ready` to see unblocked beads
2. **Select highest priority bead** that matches filter
3. **Check dependencies**: Skip if blocked by other beads
4. **Present bead to user**: Show what will be worked on next
5. **Wait for user confirmation**: User says "proceed" or "skip"

### Phase 2: Bead Enrichment

After user confirms a bead:

1. **Read bead details**: `bd show {bead-id}`
2. **Explore legacy code**: Find referenced files in apps/web-legacy
3. **Analyze implementation patterns**: Understand existing code structure
4. **Update bead with granular details**:
   ```bash
   bd update {bead-id} --description "$(cat <<'EOF'
   # Detailed Implementation Plan

   ## Legacy Reference
   - Files: [list files analyzed]
   - Key functions: [list functions]
   - Form fields: [list fields and validation]

   ## Implementation Steps
   1. Create route file at X
   2. Create component at Y
   3. Add server function at Z

   ## Specific Code Patterns
   [Code snippets and patterns to follow]

   ## Testing Requirements
   [Specific test cases]
   EOF
   )"
   ```

### Phase 3: Agent Delegation

Based on bead type, delegate to appropriate agents:

**Frontend-only beads**:
```
@frontend implement {bead-id}
```

**Backend-only beads**:
```
@backend implement {bead-id}
```

**Full-stack beads** (most common):
```
@backend implement {bead-id}  # First - creates server functions
[Wait for backend ready]
@frontend implement {bead-id}  # Second - uses server functions
```

### Phase 4: Testing

After implementation agents report ready:

```
@tester write tests for {bead-id}
```

Tester writes:
- Unit tests (Bun test)
- E2E tests (Playwright)
- Verifies coverage thresholds

### Phase 5: Comprehensive Review

After tester reports ready, invoke reviewer with FULL quality gates:

```
@reviewer review {bead-id} --comprehensive
```

**Reviewer MUST run ALL of these commands**:
```bash
pnpm test           # All unit tests pass
pnpm lint           # ESLint validation
pnpm typecheck      # TypeScript checks
pnpm build          # Production build
pnpm dev &          # Start dev server (background)
# Wait for server ready
docker build -t vamsa-test -f docker/Dockerfile .  # Docker build
docker run --rm -d -p 3001:3000 vamsa-test         # Docker run test
# Verify app loads at localhost:3001
docker stop $(docker ps -q --filter ancestor=vamsa-test)  # Cleanup
```

**Reviewer only closes bead if ALL commands succeed.**

### Phase 6: Issue Resolution

If reviewer finds issues:

1. **Document issues** in bead comments
2. **Identify responsible agent**:
   - UI/components/styling → @frontend
   - Server functions/database/API → @backend
   - Tests/coverage → @tester
3. **Reassign and notify agent**
4. **Re-invoke reviewer after fix**
5. **Loop until all checks pass**

### Phase 7: Bead Closure

When reviewer successfully closes a bead:

1. **Confirm closure**: `bd show {bead-id}` - status should be "closed"
2. **Select next bead**: Return to Phase 1
3. **Continue until no beads remain** or user says "stop"

### Phase 8: Loop Completion

When all filtered beads are closed:

```
<promise>BEAD_LOOP_COMPLETE</promise>
```

## Stop Hook

The system includes a stop hook that:

- Checks for `<promise>BEAD_LOOP_COMPLETE</promise>` in output
- If found: Allows normal exit
- If not found: Re-feeds conversation to Tech Lead
- Enforces `--max-iterations` limit

## Bead Priority Order

Tech Lead processes beads in this order:

1. **P0 (Critical)** - Blockers, production issues
2. **P1 (High)** - Core functionality
3. **P2 (Medium)** - Important features
4. **P3 (Low)** - Nice-to-haves
5. **P4 (Backlog)** - Future work

Within same priority, process in creation order (oldest first).

## Agent Coordination Flow

```
Tech Lead (orchestrator)
  │
  ├─ Phase 1: Select bead from bd ready
  │
  ├─ Phase 2: Enrich bead with implementation details
  │
  ├─ Phase 3: Delegate to agents
  │  ├─ @backend (if server work needed)
  │  │  └─ Implements server functions, schemas, migrations
  │  │
  │  └─ @frontend (if UI work needed)
  │     └─ Implements components, routes, forms
  │
  ├─ Phase 4: @tester
  │  └─ Writes unit tests, E2E tests
  │
  ├─ Phase 5: @reviewer (comprehensive)
  │  ├─ pnpm test
  │  ├─ pnpm lint
  │  ├─ pnpm typecheck
  │  ├─ pnpm build
  │  ├─ pnpm dev (verify startup)
  │  ├─ docker build
  │  └─ docker run (verify container)
  │
  ├─ Phase 6: Issue resolution (if needed)
  │  └─ Loop until all checks pass
  │
  └─ Phase 7: Bead closed → Next bead
```

## Quality Gates (Reviewer Must Run All)

| Command | Purpose | Must Pass |
|---------|---------|-----------|
| `pnpm test` | Unit tests | Yes |
| `pnpm lint` | ESLint | Yes |
| `pnpm typecheck` | TypeScript | Yes |
| `pnpm build` | Production build | Yes |
| `pnpm dev` | Dev server starts | Yes |
| `docker build` | Container builds | Yes |
| `docker run` | Container runs | Yes |

**Bead can only be closed if ALL gates pass.**

## Example Session

```
User: /bead-loop --filter "Port" --max-iterations 100

Tech Lead (Iteration 1):
  Checking available beads...

  Found 14 beads matching "Port":
  1. vamsa-dc2 [P1] Port Registration Page
  2. vamsa-8y0 [P1] Port Claim Profile Flow
  3. vamsa-mgu [P1] Port Change Password
  ...

  Starting with: vamsa-dc2 (P1 - Registration Page)

  Enriching bead with implementation details...
  [Explores apps/web-legacy/src/app/(auth)/register/page.tsx]
  [Explores apps/web-legacy/src/actions/user.ts]
  [Updates bead with granular steps]

  Ready to implement vamsa-dc2. Reply "proceed" to continue or "skip" to move to next bead.

User: proceed

Tech Lead (Iteration 2):
  Delegating to @backend first (server functions needed)...

  @backend implement vamsa-dc2

  Monitoring status...

Tech Lead (Iteration 3+):
  Backend status: in_progress → ready ✓

  Now delegating to @frontend...

  @frontend implement vamsa-dc2

  Monitoring status...

Tech Lead (Iteration N):
  Frontend status: ready ✓

  Invoking @tester...

  @tester write tests for vamsa-dc2

Tech Lead (Iteration N+1):
  Tests complete! Coverage: 94%

  Invoking @reviewer with comprehensive quality gates...

  @reviewer review vamsa-dc2 --comprehensive

Tech Lead (Iteration N+2):
  Reviewer running quality gates:
  ✓ pnpm test - 156 tests passed
  ✓ pnpm lint - No errors
  ✓ pnpm typecheck - No errors
  ✓ pnpm build - Success
  ✓ pnpm dev - Server started
  ✓ docker build - Image built
  ✓ docker run - Container healthy

  Reviewer closed vamsa-dc2! ✓

  Moving to next bead: vamsa-8y0 (Claim Profile Flow)

  Ready to implement vamsa-8y0. Reply "proceed" to continue.

User: proceed

[Loop continues through all beads...]

Tech Lead (Final Iteration):
  All 14 "Port" beads have been completed!

  Summary:
  - vamsa-dc2: Registration Page ✓
  - vamsa-8y0: Claim Profile ✓
  - vamsa-mgu: Change Password ✓
  ... [all closed]

  <promise>BEAD_LOOP_COMPLETE</promise>

[Loop exits]
```

## Differences from /techlead-loop

| Aspect | /techlead-loop | /bead-loop |
|--------|---------------|------------|
| **Input** | Feature description | Existing beads |
| **Bead creation** | Creates new beads | Uses existing beads |
| **Scope** | Single feature | Multiple beads |
| **Enrichment** | Initial design | Granular implementation details |
| **Quality gates** | Standard (test, lint, build) | Comprehensive (+ docker) |
| **Flow** | Feature → Beads → Implementation | Beads → Enrich → Implementation |
| **Typical iterations** | 15-35 | 50-100 (multiple beads) |

## User Interaction Points

The loop pauses for user input at:

1. **Bead selection**: "Ready to implement {bead}. Reply 'proceed' or 'skip'"
2. **Issues found**: "Reviewer found issues. Reply 'fix' to continue or 'skip' to defer"
3. **Completion**: "All beads done. Reply 'commit' to push changes"

## Error Recovery

If a bead is too complex or blocked:

1. User can say "skip" to move to next bead
2. Skipped bead remains open for later
3. Loop continues with remaining beads
4. Skipped beads can be revisited in next loop run

## Requirements

- `bd` (beads CLI) - Installed and configured
- All agent configs in `.claude/agents/`
- Docker - For container validation
- pnpm - Package manager
- Permissions for all quality gate commands

---

## See Also

- `.claude/commands/techlead-loop.md` - Feature-based loop
- `.claude/agents/reviewer.md` - Comprehensive review requirements
- `.claude/hooks/bead-loop-stop.md` - Stop hook mechanism
