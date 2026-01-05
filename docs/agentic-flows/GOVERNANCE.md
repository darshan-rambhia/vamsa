# GOVERNANCE MODEL: Multi-Agent Development System

This document explains the governance constraints that ensure quality, prevent premature closure, and maintain a single point of approval.

---

## THE CORE PRINCIPLE

**Only @reviewer can close beads.**

This is NOT a limitation. This is a **safety mechanism** to ensure:
1. All quality gates run (reviewer enforces them)
2. No work is marked complete prematurely (prevents handoff errors)
3. Single point of approval (prevents conflicting closures)
4. Clear accountability (reviewer is the gatekeeper)

---

## AGENT PERMISSIONS MODEL

### Tech Lead (Primary Orchestrator)

**Broad Permissions:**
- ✓ Create beads
- ✓ Assign beads to agents
- ✓ Update bead status
- ✓ Post comments
- ✓ Run bash commands
- ✗ **CANNOT close beads** (intentional restriction)

**Why restricted?**
- Prevents accidental premature closure when moving between agents
- Ensures tech lead stays focused on orchestration, not approval
- Maintains separation of concerns: orchestration vs. validation

**Example of why this matters:**
```
Tech Lead thinking: "Both agents done, let me close this bead..."
💥 BLOCKED: Only reviewer can close

This prevents tech lead from closing before tester writes tests
This prevents tech lead from closing before reviewer runs build
This prevents bypassing quality gates
```

---

### Frontend Agent

**Allowed:**
- ✓ Implement components, pages, forms
- ✓ Run `bun run format`
- ✓ Run `bun run typecheck`
- ✓ Run `bun run lint`
- ✓ Run `bun run build`
- ✓ Update bead status to `in_progress` and `ready`
- ✓ Post completion comments
- ✗ **CANNOT close beads**
- ✗ **CANNOT commit to git**

**Why restricted?**
- Frontend's responsibility is implementation only
- Testing and review are downstream phases
- Prevents skipping quality gates

**Flow:**
```
Frontend: implement → update status to ready → post comment
Tech Lead: reads comment → invokes tester
Tester: writes tests → updates status to ready
Tech Lead: invokes reviewer
Reviewer: validates → closes bead
```

---

### Backend Agent

**Allowed:**
- ✓ Implement server actions, schemas, migrations
- ✓ Run `bunx prisma validate`
- ✓ Run `bun run typecheck`
- ✓ Run `bun run lint`
- ✓ Run `bun run build`
- ✓ Update bead status to `in_progress` and `ready`
- ✓ Post completion comments
- ✗ **CANNOT close beads**
- ✗ **CANNOT commit to git**

**Why restricted?**
- Same as frontend: prevent premature closure
- Database changes must pass review before finalization
- Forces sequential validation

---

### Tester Agent

**Allowed:**
- ✓ Write unit tests (vitest)
- ✓ Write E2E tests (playwright)
- ✓ Run `bun run test:*` commands
- ✓ Update bead status to `in_progress` and `ready`
- ✓ Post test results and coverage metrics
- ✗ **CANNOT close beads**
- ✗ **CANNOT modify non-test code**
- ✗ **CANNOT commit to git**

**Why restricted?**
- Tester's job is verification, not validation
- Tests must pass review before marking work complete
- Prevents tester from closing even if tests pass (reviewer validates the results)

**Example - why this is important:**
```
Tester writes tests and all pass locally
Tester status: ready ✓

But what if:
- Test environment differs from production
- Coverage metrics are inflated
- E2E tests are flaky
- Tests don't actually validate acceptance criteria

Only reviewer running the full suite catches these issues.
```

---

### Reviewer Agent (Gatekeeper)

**Allowed:**
- ✓ Run `bun run typecheck` - verify no type errors
- ✓ Run `bun run lint` - verify code style
- ✓ Run `bun run test:run` - verify tests pass
- ✓ Run `bun run test:coverage` - verify thresholds met
- ✓ Run `bun run build` - verify production build
- ✓ **Close beads with `bd close`** (ONLY agent with this power)
- ✓ Post detailed review comments
- ✓ Identify which agent should fix issues
- ✓ Reject incomplete work

**Why special?**
- Reviewer is the final gatekeeper
- Runs full quality suite from clean slate
- Cannot be bypassed by tech lead or other agents
- Single point of approval for production quality

**The reviewer's ultimate power:**
```
# Reviewer can:
bd close {bead-id}  # ✓ ALLOWED (only agent who can)

# Tech Lead CANNOT:
bd close {bead-id}  # ✗ PERMISSION DENIED

# Even with user's permission, tech lead cannot close
# This is intentional governance, not a bug
```

---

## WHY THIS GOVERNANCE?

### Problem It Solves

**Without this governance:**
- Tech lead closes bead after frontend done, forgetting backend
- Backend implements something incompatible with frontend
- Tester writes tests that don't catch real issues
- Reviewer finds blockers after things are marked complete
- No clear accountability for quality

**With this governance:**
- Each agent has clear responsibility
- No agent can skip phases
- Single point of approval prevents conflicts
- Quality gates are enforced by design

### The Handoff Chain

```
Frontend ────┐
            ├─→ Tech Lead ────┐
Backend  ────┘                 ├─→ Tester ────┐
                               │              ├─→ Reviewer (CLOSES)
                               │              │
                        (waits for both)      (runs full QA)
```

**Each handoff enforces a check:**
1. Frontend & Backend → Tech Lead: Are both implementations done?
2. Tech Lead → Tester: Are both ready? Then run tests
3. Tester → Reviewer: Do tests pass? Then run full QA
4. Reviewer → User: All gates pass? Then close beads

---

## PERMISSION ENFORCEMENT

### How It Works

Each agent has `permission` config in their `.opencode/agent/*.md`:

**Tech Lead:**
```yaml
permission:
  bash:
    "bd *": allow           # Can run any bd command
    "bun run *": allow      # Can run tests, build, etc.
    "*": ask                # Ask for anything else
  # Note: No "bd close" in allow list!
```

**Reviewer:**
```yaml
permission:
  bash:
    "bd *": allow           # Can run any bd command, including close
    "bun run *": allow      # Can run all quality gates
    "*": ask                # Ask for anything else
```

**Tester:**
```yaml
permission:
  bash:
    "bd comment*": allow    # Can post results
    "bd show*": allow       # Can read bead details
    "bd status*": allow     # Can update status
    "bun run *": allow      # Can run tests
    "*": deny               # Cannot do anything else
```

### What If Tech Lead Tries to Close?

```bash
# Tech Lead tries:
bd close {bead-id}

# System blocks:
Error: Permission denied: "bd close" not in allowed commands for techlead agent

# This prevents:
- Accidental premature closure
- Skipped quality gates
- Reviewer being bypassed
```

---

## ISSUE RESOLUTION WORKFLOW

When reviewer finds issues, the governance model ensures proper handling:

### Step 1: Reviewer Identifies Issue

```bash
# Reviewer finds TypeScript error
bun run typecheck
# Output: Error in src/actions/person.ts:45

# Reviewer documents:
bd comment {bead-id} --body "
## Issues Found

1. TypeScript error in src/actions/person.ts:45
   Type 'string | null' cannot be assigned to type 'string'

### Recommendation
Reassign to @backend for fix.
"
```

### Step 2: Tech Lead Reassigns

```bash
# Tech Lead reads comment and reassigns
bd assign {bead-id} @backend

# Tech Lead notifies agent
@backend - Issues found in {bead-id}. See comments.
```

### Step 3: Agent Fixes

```bash
# Backend agent:
bd status {bead-id} in_progress
# Fix the TypeScript error
bun run typecheck  # Verify fix
bun run build      # Verify build
bd status {bead-id} ready
bd comment {bead-id} --body "Issues fixed. TypeScript ✓, build ✓"
```

### Step 4: Tech Lead Re-Invokes Reviewer

```bash
# Tech Lead
@reviewer review {bead-id}

# Reviewer runs quality gates again
# If all pass:
bd close {bead-id}
```

**Key governance aspects:**
- ✓ Reviewer identifies but doesn't fix
- ✓ Tech Lead coordinates the fix but doesn't implement
- ✓ Responsible agent fixes their own code
- ✓ Reviewer has final say on closure
- ✓ Clear accountability at each step

---

## COMPARISON: With vs Without Governance

### WITHOUT Governance (Tech Lead can close)

```
Tech Lead: "Frontend done, backend done, tests pass.
           Let me close all these beads before I forget."

bd close {frontend-bead-id}
bd close {backend-bead-id}
bd close {epic-id}

❌ Problem: Frontend might have issues reviewer would catch
❌ Problem: Build might fail in production environment
❌ Problem: Coverage might be below threshold
❌ Problem: No gatekeeper

Result: Bad code ships to production
```

### WITH Governance (Only Reviewer Can Close)

```
Tech Lead: "Frontend done, backend done, tests pass.
           Ready for @reviewer to validate."

@reviewer review {epic-id}

Reviewer runs full QA:
✓ typecheck
✓ lint
✓ test:run
✓ test:coverage
✓ build

If all pass:
bd close {bead-id}

If issues found:
bd comment {bead-id} --body "Issues found..."

Result: Only approved code ships
```

---

## FAQ

### Q: Why can't Tech Lead close beads?

**A:** Because tech lead has too many other responsibilities and might forget to:
- Wait for all quality gates
- Check coverage thresholds
- Verify E2E tests pass
- Validate acceptance criteria

Forcing beads to go through reviewer prevents this.

### Q: What if user wants to force close a bead?

**A:** This should not happen. If quality gates aren't passing, there's a reason:
1. Code isn't ready
2. Tests aren't comprehensive
3. Acceptance criteria not met

The right solution is: **Fix the issues, don't skip the gates.**

### Q: Can reviewer reopen a closed bead?

**A:** No. If reviewer closed it, work is done. If you find new issues later, create a new bead for the next iteration.

### Q: What if Frontend and Backend conflict?

**A:** This is caught in testing phase:
1. Frontend & Backend implement independently
2. Tester writes integration tests
3. Tester finds conflicts (E2E tests fail)
4. Tech Lead reassigns to responsible agent
5. Agent fixes compatibility issue
6. Tests pass
7. Reviewer closes

The governance ensures: **conflicts are found and fixed before shipping.**

---

## BENEFITS OF THIS MODEL

| Benefit | How Governance Achieves It |
| --- | --- |
| **Single approval point** | Only reviewer can close |
| **Quality gates enforced** | Reviewer runs full suite |
| **No premature closure** | Tech lead cannot close (prevents rushing) |
| **Clear accountability** | Each agent knows their role and limits |
| **Issue tracking** | All problems documented before fixes |
| **Parallel efficiency** | Frontend & backend work simultaneously |
| **Sequential safety** | Testing then review prevents conflicts |
| **Production hardening** | Reviewer is final gatekeeper |

---

## SUMMARY

The governance model is a **feature, not a limitation**:

- **Tech Lead** orchestrates: analyzes, plans, delegates, reassigns
- **Specialists** execute: frontend implements UI, backend implements API, tester verifies, reviewer approves
- **Reviewer** is the gatekeeper: runs all quality gates and closes beads
- **User** makes final decision: approves plan and approves commit

This separation of concerns ensures:
1. Nothing is skipped
2. Everything is verified
3. Someone is always accountable
4. Quality gates are enforced by design

The system is **self-governing**: it prevents bad behavior by design, not by trust.
