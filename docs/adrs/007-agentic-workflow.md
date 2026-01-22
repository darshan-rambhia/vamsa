# VAMSA MULTI-AGENT WORKFLOW QUICK REFERENCE

**Goal:** Coordinate frontend, backend, tester, and reviewer agents to deliver complete features.

---

## 5 PHASES OF DELIVERY

### Phase 1: Analysis & Planning (Tech Lead)

```bash
# Explore codebase for patterns
bd list --status=open

# Create epic
bd create "Epic: {Feature Name}" --type epic --priority 2 --body "..."

# Create implementation beads
bd create "Frontend: {Feature}" --type frontend --parent {epic-id} --body "..."
bd create "Backend: {Feature}" --type backend --parent {epic-id} --body "..."

# Present plan to user
# Wait for "approved" response
```

**Deliverables:**

- Epic bead with overview and technical design
- Frontend bead with UI/UX scope
- Backend bead with API/database scope
- User approval

---

### Phase 2: Parallel Implementation

**START BOTH SIMULTANEOUSLY (do not wait between them):**

```bash
@frontend implement {frontend-bead-id}
@backend implement {backend-bead-id}
```

Each agent:

1. `bd show {bead-id}` → review requirements
2. `bd assign {bead-id} @{agent-name}` → claim work
3. `bd status {bead-id} in_progress` → signal start
4. Implement code
5. Run quality gates: `format`, `typecheck`, `lint`, `build`
6. `bd status {bead-id} ready` → signal completion
7. `bd comment {bead-id} --body "..."` → post results

**Deliverables:**

- Frontend: UI components, pages, forms
- Backend: Server actions, database models, migrations
- Both report status as `ready`

---

### Phase 3: Testing (Sequential)

**WAIT for both frontend and backend to report `ready`, then:**

```bash
# Check both are ready
bd show {frontend-bead-id}  # Should show: ready
bd show {backend-bead-id}   # Should show: ready

# Invoke tester
@tester write tests for {epic-id}
```

Tester:

1. `bd show {epic-id}` → review acceptance criteria
2. `bd assign {epic-id} @tester` → claim work
3. `bd status {epic-id} in_progress` → signal start
4. Write unit tests (vitest)
5. Write E2E tests (playwright)
6. Run: `bun run test:run && bun run test:coverage && bun run test:e2e`
7. Verify coverage: Statements ≥90%, Branches ≥85%, Functions ≥90%, Lines ≥90%
8. `bd status {epic-id} ready` → signal completion
9. `bd comment {epic-id} --body "Tests: X passing. Coverage: X%"` → post results

**Deliverables:**

- Unit tests covering all edge cases
- E2E tests for user workflows
- Coverage metrics exceeding thresholds
- Status reported as `ready`

---

### Phase 4: Review & Approval (Sequential)

**WAIT for tester to report `ready`, then:**

```bash
# Check tester is ready
bd show {epic-id}  # Should show: ready

# Invoke reviewer
@reviewer review {epic-id}
```

Reviewer runs:

1. `bun run typecheck` → no type errors
2. `bun run lint` → no lint warnings
3. `bun run test:run` → all tests pass
4. `bun run test:coverage` → coverage thresholds met
5. `bun run build` → production build succeeds

**Scenario A - All checks pass:**

```bash
# Reviewer closes beads
bd close {epic-id} {frontend-bead-id} {backend-bead-id}
```

**Scenario B - Issues found:**

```bash
# Reviewer documents issues and requests tech lead to reassign
bd comment {epic-id} --body "## Review Issues

### Issues
1. TypeScript error in src/actions/...
2. Test coverage below threshold

### Action Needed
Please reassign to responsible agent."

# Tech Lead identifies responsible agent and reassigns
bd assign {bead-id} @{agent-name}  # @frontend, @backend, or @tester

# Tech Lead notifies agent
@backend - Issues found. See {bead-id} for details. Fix and report back.

# Agent fixes issues
# Agent updates status to `ready`
# Tech Lead re-invokes reviewer
@reviewer review {bead-id}

# Repeat until all pass
```

**Deliverables:**

- All quality gates passing
- Reviewer closes all beads (ONLY reviewer can do this)
- Feature approved for production

---

### Phase 5: Finalization (Tech Lead)

**AFTER reviewer closes all beads:**

```bash
# Verify all beads closed
bd show {epic-id}  # Should show: closed

# Optionally commit changes
# (ask user if they want to commit)

git add .
git commit -m "feat: {feature name}

Description of changes.

Closes: {epic-id} {frontend-bead-id} {backend-bead-id}"

bd sync  # Sync beads to git
git push
```

**Deliverables:**

- All code committed to git
- All beads marked closed
- Feature ready for deployment

---

## COMMAND REFERENCE

### Beads Commands

```bash
# Create bead
bd create "Title" --type {epic|frontend|backend|task|bug} --priority {0-4} --parent {parent-id}

# Show details
bd show {bead-id}

# Update status
bd status {bead-id} {open|in_progress|ready|closed}

# Assign agent
bd assign {bead-id} @{frontend|backend|tester|reviewer|techlead}

# Add comment
bd comment {bead-id} --body "Message"

# Close bead (REVIEWER ONLY)
bd close {bead-id}

# List open work
bd list --status=open

# Find ready work
bd ready

# Sync with git
bd sync --from-main
```

### Quality Gates

```bash
# Format code
bun run format

# Type check
bun run typecheck

# Lint
bun run lint

# Build
bun run build

# Run tests
bun run test:run      # Unit tests
bun run test:e2e      # E2E tests
bun run test:coverage # Coverage with thresholds

# Prisma
bunx prisma validate  # Validate schema
bunx prisma migrate dev --name {name}  # Create migration
```

---

## GOVERNANCE RULES

### Only Reviewer Can Close Beads

```bash
# ✓ ALLOWED (reviewer only)
@reviewer: bd close {bead-id}

# ✗ FORBIDDEN (even for tech lead)
@techlead: bd close {bead-id}  # Permission denied
@frontend: bd close {bead-id}  # Permission denied
@backend: bd close {bead-id}   # Permission denied
@tester: bd close {bead-id}    # Permission denied
```

### Agent Responsibilities

| Agent     | Can Do                            | Cannot Do                  |
| --------- | --------------------------------- | -------------------------- |
| Tech Lead | Create beads, assign, orchestrate | Close beads, mark complete |
| Frontend  | Implement UI, update status       | Close beads, commit code   |
| Backend   | Implement API, update status      | Close beads, commit code   |
| Tester    | Write tests, update status        | Close beads, modify code   |
| Reviewer  | **Close beads**, run QA gates     | Implement, modify code     |

---

## TROUBLESHOOTING

### Frontend/Backend Taking Too Long

```bash
# Check status
bd show {bead-id}

# If status is "in_progress", they're still working
# Be patient - typical implementation takes 1-2 hours

# If status is still "open", they may have missed it
# Re-invoke agent with mention
@frontend implement {bead-id}
```

### Tester Reports Coverage Below Threshold

```bash
# Identify which files lack coverage
bun run test:coverage

# Tech Lead reassigns to tester to add more tests
bd assign {bead-id} @tester

# Tester adds tests to fill gaps
@tester - Please add tests to reach 90% coverage on src/lib/...
```

### Reviewer Finds Issues

```bash
# Read reviewer comments
bd show {bead-id}

# Identify responsible agent
# If UI component issue → @frontend
# If API/database issue → @backend
# If test issue → @tester

# Reassign bead
bd assign {bead-id} @{agent-name}

# Notify agent
@{agent-name} - Issues found in {bead-id}. See comments for details.

# Agent fixes and reports ready
# Tech Lead re-invokes reviewer
@reviewer review {bead-id}
```

### Build Fails

```bash
# Check error
bun run build

# Determine responsible agent
# Usually TypeScript error → whoever touched the file

# Reassign for fixing
bd assign {bead-id} @{agent-name}

# Agent runs:
bun run typecheck  # Find type errors
# Fix issues
bun run build      # Verify build succeeds
```

---

## FLOW DIAGRAM

```
User: "Add feature X"
  ↓
Tech Lead: Analyze → Create beads → Present plan
  ↓
User: "approved"
  ↓
Frontend & Backend: Work in parallel
  Frontend: ready ✓  Backend: ready ✓
  ↓
Tester: Write tests (wait for both)
  Tester: ready ✓
  ↓
Reviewer: Run all quality gates (wait for tester)
  ├─ All pass? → Close beads → Done ✓
  └─ Issues? → Report → Tech Lead → Reassign → Fix loop
  ↓
Tech Lead: Commit changes
```

---

## CHECKLIST: Starting New Feature

- [ ] User describes feature
- [ ] Tech Lead analyzes codebase
- [ ] Tech Lead creates epic bead
- [ ] Tech Lead creates frontend bead
- [ ] Tech Lead creates backend bead
- [ ] Tech Lead presents plan to user
- [ ] User replies "approved"
- [ ] Tech Lead invokes @frontend
- [ ] Tech Lead invokes @backend
- [ ] Monitor both for "ready" status
- [ ] Tech Lead invokes @tester
- [ ] Monitor tester for "ready" status
- [ ] Tech Lead invokes @reviewer
- [ ] Monitor reviewer for beads closed
- [ ] Tech Lead commits if approved by user

---

## KEY INSIGHT

**You have a self-governing quality system:**

1. **Implementation** (frontend + backend) - Specialists execute in parallel
2. **Testing** (tester) - Comprehensive verification after implementation
3. **Review** (reviewer) - Final gatekeeper who closes beads
4. **Orchestration** (tech lead) - Coordinator who routes work and manages issues

This ensures:

- ✓ No premature closure (only reviewer can close)
- ✓ All quality gates run (reviewer enforces)
- ✓ Parallel efficiency (frontend + backend work simultaneously)
- ✓ Sequential safety (testing then review in order)
- ✓ Single point of approval (reviewer is gatekeeper)

---

**For detailed workflow example:** See `.opencode/agent/techlead.md` → "Complete Workflow Example"
