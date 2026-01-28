# MULTI-AGENT DEVELOPMENT TEAM ARCHITECTURE

Your Vamsa project now has a complete **self-governing multi-agent development system** inspired by ralph-wiggum's autonomous iteration model, but adapted for team-based feature delivery.

---

## SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER / FEATURE REQUEST                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │      TECH LEAD (Primary Agent)        │
        │  - Analyze requirements               │
        │  - Design solutions                   │
        │  - Create beads (epics + impl.)       │
        │  - Present plan to user               │
        │  - Orchestrate agents                 │
        │  - Manage issue resolution            │
        └───────────────┬───────────────────────┘
                        │
                  User approves
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
     ┌────────────────┐    ┌─────────────────┐
     │  FRONTEND      │    │   BACKEND       │  ◄── PARALLEL
     │  (gemini)      │    │   (haiku)       │      Execution
     │  - UI/UX       │    │   - API Logic   │
     │  - Components  │    │   - Database    │
     │  - Forms       │    │   - Auth        │
     └────────┬───────┘    └────────┬────────┘
              │                    │
              ✓ ready          ✓ ready
              │                    │
              └────────┬──────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │  TESTER (haiku)          │  ◄── SEQUENTIAL
        │  - Unit tests (vitest)   │      Execution
        │  - E2E tests (playwright)│
        │  - Coverage validation   │
        └──────────┬───────────────┘
                   │
                ✓ ready
                   │
                   ▼
        ┌───────────────────────────┐
        │  REVIEWER (opus)          │  ◄── FINAL
        │  Quality gatekeeper       │      VALIDATION
        │  - Run full QA suite      │
        │  - Verify criteria met    │
        │  - CLOSE beads            │
        └───────────┬───────────────┘
                    │
              ✓ All approved
                    │
                    ▼
        ┌───────────────────────────┐
        │  TECH LEAD: Commit        │
        │  (if user approves)       │
        └───────────────────────────┘
```

---

## FIVE EXECUTION PHASES

### Phase 1: Analysis & Planning

**Agent:** Tech Lead
**Duration:** Interactive (depends on feature complexity)
**Outcome:** Epic + implementation beads + user approval

```
Input: Feature request from user
  ↓
Tech Lead: Analyze codebase → Design solution → Create beads
  ↓
Tech Lead: Present plan to user
  ↓
User: Provide feedback or approval
  ↓
Output: Approved beads ready for implementation
```

**Tech Lead creates:**

- **Epic bead** (parent): Overview, technical design, acceptance criteria
- **Frontend bead** (child): UI scope, components, pages, forms
- **Backend bead** (child): API logic, database, schemas, migrations

**Tech Lead waits for:** `"approved"` response from user before proceeding

---

### Phase 2: Parallel Implementation

**Agents:** Frontend (gemini) + Backend (haiku)
**Duration:** Concurrent (independent of each other)
**Outcome:** Both report `ready` status with quality gates passed

```
Tech Lead: @frontend implement {bead-id}
Tech Lead: @backend implement {bead-id}
(do not wait between them)
  ↓
Frontend Agent (in parallel):
  1. Review bead requirements
  2. Implement components/pages/forms
  3. Run: format, typecheck, lint, build
  4. Update status to `ready`
  5. Post completion comment

Backend Agent (in parallel):
  1. Review bead requirements
  2. Implement actions, schemas, migrations
  3. Run: typecheck, lint, build
  4. Update status to `ready`
  5. Post completion comment
  ↓
Output: Both agents report `ready`, no blockers for testing
```

**Key aspect:** Frontend and backend work **simultaneously**, not sequentially. They only need to coordinate at the API boundary, which is defined in the beads.

---

### Phase 3: Comprehensive Testing

**Agent:** Tester (haiku)
**Duration:** Triggered after both frontend and backend report `ready`
**Outcome:** All tests pass, coverage meets thresholds

```
Tech Lead: (waits for both frontend and backend to be `ready`)
Tech Lead: @tester write tests for {epic-id}
  ↓
Tester Agent:
  1. Review acceptance criteria
  2. Write unit tests (vitest) for:
     - Server actions
     - Zod schemas
     - Utility functions
     - Components (if needed)
  3. Write E2E tests (playwright) for:
     - Complete user workflows
     - Integration between frontend/backend
     - Edge cases
  4. Run: test:run, test:coverage, test:e2e
  5. Verify coverage:
     - Statements ≥ 90%
     - Branches ≥ 85%
     - Functions ≥ 90%
     - Lines ≥ 90%
  6. Update status to `ready`
  7. Post coverage metrics
  ↓
Output: Comprehensive test suite, all quality gates passing
```

**Why wait for both?** Frontend and backend must be tested together to catch integration issues.

---

### Phase 4: Quality Review & Approval

**Agent:** Reviewer (opus)
**Duration:** Triggered after tester reports `ready`
**Outcome:** All beads closed (if all pass) OR issues documented for fixes

```
Tech Lead: (waits for tester to be `ready`)
Tech Lead: @reviewer review {epic-id}
  ↓
Reviewer Agent:
  1. Run typecheck → no type errors
  2. Run lint → no style issues
  3. Run test:run → all tests pass
  4. Run test:coverage → thresholds met
  5. Run build → production build succeeds

  If ALL pass:
    6a. Close beads: bd close {epic-id} {frontend-bead-id} {backend-bead-id}
    Output: Feature approved for production

  If ANY fail:
    6b. Document issues
    6c. Identify responsible agent
    6d. Request tech lead reassign
    Output: Issues documented, waiting for fixes

If issues found → Tech Lead reassigns → Agent fixes → Loop back to Phase 4
  ↓
Output: All beads closed, feature ready to ship
```

**Reviewer is the final gatekeeper:** Only agent with authority to close beads. This prevents premature closure and ensures all gates pass.

---

### Phase 5: Finalization & Commit

**Agent:** Tech Lead
**Duration:** Final step after reviewer closes all beads
**Outcome:** Code committed to git, beads synced

```
Tech Lead: (confirms all beads are closed)
Tech Lead: (asks user for approval to commit)
User: "commit"
  ↓
Tech Lead:
  1. git add .
  2. git commit -m "feat: {feature}

     Description of changes.

     Closes: {epic-id} {frontend-id} {backend-id}"
  3. bd sync (sync beads to git)
  4. git push
  ↓
Output: Feature committed and pushed to remote
```

---

## KEY ARCHITECTURAL DECISIONS

### 1. Parallel Frontend + Backend Implementation

**Decision:** Frontend and backend work simultaneously after approval.

**Why:** Reduces total delivery time. UI and API can be developed independently since both teams understand the integration points from the beads.

**Constraint:** Frontend must wait for API specs to be complete. Backend must wait for UI requirements to be clear. Both specified in beads before implementation starts.

### 2. Sequential Quality Gates

**Decision:** Testing then review must happen in order (not parallel).

**Why:**

- Tester needs both frontend and backend complete
- Tester tests the integration
- Reviewer needs complete test suite
- Reviewer runs full QA on clean slate

### 3. Governance: Only Reviewer Closes

**Decision:** Reviewer is the only agent who can execute `bd close`.

**Why:**

- Prevents premature closure
- Ensures all quality gates run
- Maintains single point of approval
- Tech lead cannot accidentally skip reviewer

**Enforcement:** Permission system in agent configs prevents close command for all other agents.

### 4. Issue Resolution Loop

**Decision:** If reviewer finds issues, responsible agent fixes and reviewer re-validates.

**Why:**

- Maintains accountability
- Each agent owns their domain
- Prevents ad-hoc fixes by wrong person
- Clear tracking of resolution

### 5. User Approvals at Gates

**Decision:** User approves plan before orchestration, approves commit after review.

**Why:**

- User sees full plan before implementation starts
- User controls what gets shipped
- Tech lead cannot ship without user consent
- Maintains human oversight

---

## AGENT SPECIALIZATION

### Tech Lead (claude-opus-4-5 or claude-sonnet-4)

**Capabilities:**

- Full codebase understanding
- Architectural decisions
- Cross-cutting concern analysis
- Issue coordination
- Orchestration logic

**Responsibilities:**

1. Analyze feature requests
2. Design solutions
3. Create and structure beads
4. Coordinate parallel work
5. Handle issue resolution
6. Manage handoffs between agents

**Implementation:** See [`.claude/agents/techlead.md`](../../.claude/agents/techlead.md)

**Restrictions:**

- Cannot close beads (prevents premature approval)
- Cannot implement code (stays focused on coordination)

---

### Frontend Agent (claude-sonnet-4)

**Specialization:** React/TanStack Start UI implementation

**Capabilities:**

- Component architecture
- shadcn/ui patterns
- Form handling (react-hook-form + zod)
- TanStack Router file-based routing
- Accessibility

**Responsibilities:**

1. Implement UI components
2. Create pages (TanStack Start routes)
3. Build forms
4. Handle client-side interactivity
5. Run quality gates (format, typecheck, lint, build)

**Implementation:** See [`.claude/agents/frontend.md`](../../.claude/agents/frontend.md)

**Workflow:**

```
Receive bead → Review requirements → Implement → Quality gates → Report ready
```

---

### Backend Agent (claude-haiku-4)

**Specialization:** TypeScript/Drizzle server-side implementation

**Capabilities:**

- TanStack Start server functions
- Drizzle modeling
- Database migrations
- Zod schema design
- Auth/permission logic

**Responsibilities:**

1. Implement server functions
2. Design database models
3. Create Zod schemas
4. Handle migrations
5. Run quality gates (typecheck, lint, build)

**Implementation:** See [`.claude/agents/backend.md`](../../.claude/agents/backend.md)

**Workflow:**

```
Receive bead → Review requirements → Implement → Quality gates → Report ready
```

---

### Testing Agent (claude-haiku-4)

**Specialization:** Test coverage and quality metrics

**Capabilities:**

- Bun test unit testing
- Playwright E2E testing
- Coverage analysis
- Test pattern design
- Page Object Model (POM)

**Responsibilities:**

1. Write unit tests
2. Write E2E tests
3. Verify coverage thresholds
4. Test acceptance criteria
5. Run all test suites

**Implementation:** See [`.claude/agents/tester.md`](../../.claude/agents/tester.md)

**Testing Skill:** See [`.claude/skills/testing/SKILL.md`](../../.claude/skills/testing/SKILL.md)

**Restrictions:**

- Cannot close beads (only reviewer can)
- Cannot modify non-test code
- Cannot commit to git

**Workflow:**

```
Receive epic → Review acceptance criteria → Write tests → Verify coverage → Report ready
```

---

### Reviewer Agent (claude-opus-4-5)

**Specialization:** Quality assurance and approval gatekeeper

**Capabilities:**

- Full project understanding
- Quality gate orchestration
- TypeScript/lint/build validation
- Coverage threshold verification
- Acceptance criteria validation

**Responsibilities:**

1. Run typecheck
2. Run lint
3. Run all tests
4. Verify coverage thresholds
5. Verify build succeeds
6. Check acceptance criteria
7. **Close beads** (ONLY agent with this permission)

**Implementation:** See [`.claude/agents/reviewer.md`](../../.claude/agents/reviewer.md)

**Workflow:**

```
Receive bead → Run ALL quality gates →
  If pass: Close beads ✓
  If fail: Document issues, request fixes
```

**Unique power:** Only agent who can execute `bd close {bead-id}`

---

## QUALITY GATES ENFORCEMENT

### Phase 2 (Frontend + Backend)

Each implements independently and runs:

- `bun run format` - Code formatting
- `bun run typecheck` - Type safety
- `bun run lint` - Code style
- `bun run build` - Production build

Backend additionally:

- Database schema validation via TypeScript types

### Phase 3 (Tester)

```bash
pnpm test               # Unit tests must pass
pnpm test:coverage      # Coverage thresholds:
                        #   Statements ≥ 90%
                        #   Branches ≥ 85%
                        #   Functions ≥ 90%
                        #   Lines ≥ 90%
pnpm test:e2e           # E2E tests must pass
```

### Phase 4 (Reviewer - Full Suite)

```bash
pnpm typecheck          # No type errors
pnpm lint               # No lint warnings
pnpm test               # All tests pass
pnpm test:coverage      # Coverage validated
pnpm build              # Production build succeeds
```

If all pass → Reviewer closes beads
If any fail → Document issues, reassign to agent

---

## SUCCESS METRICS

### Code Quality

- ✓ TypeScript compilation passes
- ✓ ESLint passes
- ✓ Prettier formatting applied
- ✓ Production build succeeds

### Test Coverage

- ✓ 90% statement coverage
- ✓ 85% branch coverage
- ✓ 90% function coverage
- ✓ 90% line coverage
- ✓ All acceptance criteria tested

### Acceptance Criteria

- ✓ Each criterion implemented
- ✓ Each criterion has corresponding test
- ✓ Each criterion verified by reviewer

### Delivery Process

- ✓ Plan approved by user before implementation
- ✓ Parallel frontend/backend execution
- ✓ All quality gates enforced by reviewer
- ✓ Issues found and fixed with clear accountability
- ✓ Final commit approved by user

---

## IMPLEMENTATION READINESS

Your system is now fully documented with:

**Agent Definitions:**
- [`.claude/agents/techlead.md`](../../.claude/agents/techlead.md) - Tech Lead orchestration workflow
- [`.claude/agents/frontend.md`](../../.claude/agents/frontend.md) - Frontend agent guidelines
- [`.claude/agents/backend.md`](../../.claude/agents/backend.md) - Backend agent guidelines
- [`.claude/agents/tester.md`](../../.claude/agents/tester.md) - Tester agent guidelines
- [`.claude/agents/reviewer.md`](../../.claude/agents/reviewer.md) - Reviewer governance and quality gates

**Skills:**
- [`.claude/skills/testing/SKILL.md`](../../.claude/skills/testing/SKILL.md) - Testing skill with recipes
- [`.claude/skills/design/SKILL.md`](../../.claude/skills/design/SKILL.md) - Design system skill

**Architecture Docs:**
- [`WORKFLOW.md`](./WORKFLOW.md) - Quick reference for executing workflows
- [`GOVERNANCE.md`](./GOVERNANCE.md) - Why only reviewer closes beads
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - This document

**To use the system:**

1. Describe your feature to the Tech Lead agent
2. Tech Lead creates beads and presents plan
3. Reply "approved" when ready
4. System orchestrates agents through phases
5. Reply "commit" when reviewer closes all beads

The system is self-governing through permissions and design constraints that prevent shortcuts and enforce quality.
