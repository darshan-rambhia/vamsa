# Autonomous Multi-Agent Workflow: /techlead-loop

Your Vamsa project now has a **fully autonomous feature delivery system** powered by `/techlead-loop` command.

---

## THE VISION

You describe a feature in one sentence. The Tech Lead agent works autonomously for 4-8 hours, orchestrating frontend, backend, tester, and reviewer agents through all phases of delivery. When complete, all code is committed and beads are closed.

```
User: /techlead-loop "Add email notifications when users suggest changes"

[Tech Lead runs autonomously]

[4-8 hours later]

Tech Lead: All work complete!
<promise>FEATURE_COMPLETE</promise>

[Feature is shipped, code committed, beads closed]
```

---

## HOW IT WORKS

### The Self-Referential Loop

The `/techlead-loop` command creates a **self-healing feedback loop** using the stop hook:

1. **Iteration 1**: Tech Lead creates beads and presents plan → tries to exit
2. **Stop Hook**: Detects no completion promise → re-feeds conversation
3. **Iteration 2**: Tech Lead reads "approved" → invokes frontend + backend → tries to exit
4. **Stop Hook**: Detects no completion promise → re-feeds conversation
5. **Iteration 3**: Tech Lead polls status → both ready → invokes tester → tries to exit
6. **Stop Hook**: Detects no completion promise → re-feeds conversation
7. **Iterations 4+**: Tech Lead polls tester → invokes reviewer → handles issues → retries
8. **Final Iteration**: Tech Lead commits → outputs completion promise → tries to exit
9. **Stop Hook**: Detects `<promise>FEATURE_COMPLETE</promise>` → allows exit ✓

The magic: **Tech Lead sees its own previous work and autonomously determines next steps.**

---

## THE FIVE PHASES

### Phase 1: Analysis & Planning (Iterations 1-2)

```
Iteration 1:
  Tech Lead: Analyzes feature
  Tech Lead: Creates epic + frontend/backend beads
  Tech Lead: Presents plan to user
  Tech Lead: Tries to exit

Stop Hook: No promise found → re-feed conversation

Iteration 2:
  Tech Lead: Sees entire conversation from iteration 1
  Tech Lead: Checks if user approved

  Waits for user to say "approved"...
```

User replies: `approved`

### Phase 2: Parallel Implementation (Iterations 3-8)

```
Iteration 3:
  Tech Lead: Sees "approved" ✓
  Tech Lead: @frontend implement {id}
  Tech Lead: @backend implement {id}
  Tech Lead: Invokes both, does NOT wait
  Tech Lead: Tries to exit

Stop Hook: No promise found → re-feed

Iteration 4:
  Tech Lead: Checks bd show {frontend-id}
  Status: in_progress
  Tech Lead: Checks bd show {backend-id}
  Status: in_progress
  Tech Lead: Both still working, tries to exit

Stop Hook: No promise found → re-feed

[Polling continues every iteration, agents work independently]

Iteration 8:
  Tech Lead: Checks both
  Frontend: ready ✓
  Backend: ready ✓
  Tech Lead: Proceeds to Phase 3
```

### Phase 3: Testing (Iterations 9-12)

```
Iteration 9:
  Tech Lead: Both are ready ✓
  Tech Lead: @tester write tests for {epic-id}
  Tech Lead: Tries to exit

Stop Hook: No promise found → re-feed

Iteration 10-12:
  Tech Lead: Polls tester status
  Tester: in_progress
  Tech Lead: Continues polling...

  [Tester writes tests, runs coverage analysis]

Iteration 12:
  Tech Lead: Polls tester
  Tester: ready ✓ (with coverage metrics)
  Tech Lead: Proceeds to Phase 4
```

### Phase 4: Review & Issue Resolution (Iterations 13-20+)

```
Iteration 13:
  Tech Lead: Tester is ready ✓
  Tech Lead: @reviewer review {epic-id}
  Tech Lead: Tries to exit

Stop Hook: No promise found → re-feed

Iteration 14-15:
  Tech Lead: Polls reviewer
  Reviewer: in_progress
  Tech Lead: Continues polling...

  [Reviewer runs full QA suite]

Iteration 16 (Scenario A: All pass):
  Tech Lead: Polls reviewer
  Beads: closed ✓
  Tech Lead: All gates passed!
  Tech Lead: Proceeds to Phase 5

Iteration 16 (Scenario B: Issues found):
  Tech Lead: Polls reviewer
  Reviewer: Posted comments with issues
  Tech Lead: Reads bd show {bead-id}
  Tech Lead: Identifies: TypeScript error → @backend
  Tech Lead: bd assign {bead-id} @backend
  Tech Lead: @backend - Issues found. See {bead-id} comments.

  [Agent fixes issue, reports ready]

Iteration 17:
  Tech Lead: @reviewer review {bead-id} (re-review)
  Tech Lead: Polls again...

  [Loop continues until all pass]
```

### Phase 5: Finalization (Final Iterations)

```
Iteration 20+:
  Tech Lead: All beads closed ✓
  Tech Lead: "Ready to commit? Reply 'commit'"
  Tech Lead: Waits for user

User: commit

Final Iteration:
  Tech Lead: git add .
  Tech Lead: git commit -m "feat: email notifications..."
  Tech Lead: bd sync
  Tech Lead: git push

  Tech Lead: All work complete!
  Tech Lead: <promise>FEATURE_COMPLETE</promise>

Stop Hook: Promise found! ✓
Stop Hook: Allows exit
Loop: COMPLETE ✓
```

---

## USAGE

### Starting the Loop

```bash
/techlead-loop "Feature description" --max-iterations 50
```

**Parameters:**

- `"Feature description"` - What you want to build (required)
- `--max-iterations 50` - Max iterations before timeout (recommended)

### Example

```bash
/techlead-loop "Add email notifications when users make suggestions" --max-iterations 50
```

### What Happens Next

1. **Tech Lead analyzes** - Explores codebase, designs solution
2. **Tech Lead creates beads** - Epic + frontend + backend
3. **Tech Lead presents plan** - You review and approve
4. **You reply**: `approved`
5. **Tech Lead orchestrates** - Invokes agents, polls status, handles issues
6. **Tech Lead commits** - When all gates pass
7. **You reply**: `commit`
8. **Loop exits** - Feature is shipped

---

## USER APPROVAL POINTS

The loop pauses at TWO points for user approval:

### Approval Point 1: Feature Plan

```
Tech Lead: "Here's my plan for email notifications:

## Overview
...

## Beads Created
- Epic: Email notifications
- Frontend: Settings UI
- Backend: Email service

## Acceptance Criteria
...

Reply 'approved' to proceed, or provide feedback."

[You review the plan]

You: "approved"
```

**Recommended:** Read the plan carefully. Suggest changes if needed. Only reply "approved" when ready.

### Approval Point 2: Ready to Commit

```
Tech Lead: "All quality gates passed and @reviewer closed all beads!

Ready to commit changes?

Reply 'commit' to finalize."

[You can review changes via git diff if desired]

You: "commit"
```

**Recommended:** Optionally check `git diff` or `git status` before committing. Reply "commit" when ready to ship.

---

## MONITORING PROGRESS

While the loop is running, you can check status manually:

```bash
bd list --status=open        # See all open beads
bd show {bead-id}            # Check specific bead status
git status                   # See current changes
git diff                     # See specific changes
```

But you don't have to! Tech Lead monitors everything automatically.

---

## WHAT HAPPENS IF SOMETHING BREAKS?

### Agent Takes Too Long

If an agent gets stuck (no status change for 2+ hours):

- Tech Lead detects timeout
- Tech Lead notifies you
- You can manually intervene: `@backend do-something`
- Tech Lead resumes on next iteration

### Reviewer Finds Issues

If reviewer finds problems:

- Reviewer documents in comments
- Tech Lead reads comments on next iteration
- Tech Lead identifies responsible agent
- Tech Lead reassigns and re-invokes reviewer
- Loop continues until all pass
- **You don't need to do anything!**

### You Want to Stop

If you want to exit the loop early:

- Say: `cancel`
- Tech Lead exits gracefully
- Beads remain in their current state
- You can resume manually later

---

## WHAT THE SYSTEM ENFORCES

### Governance

- ✓ Only reviewer can close beads (prevents premature closure)
- ✓ All quality gates run (reviewer enforces)
- ✓ Parallel frontend/backend (saves time)
- ✓ Sequential testing→review (prevents conflicts)
- ✓ Issue resolution loop (finds and fixes problems)
- ✓ User approval points (you maintain control)

### Automation

- ✓ Agent invocation (tech lead invokes all)
- ✓ Status polling (tech lead monitors all)
- ✓ Phase progression (tech lead advances when ready)
- ✓ Issue detection (reviewer finds problems)
- ✓ Issue resolution (tech lead reassigns)
- ✓ Commit management (tech lead commits)

### Quality

- ✓ TypeScript compilation
- ✓ Linting
- ✓ Test coverage (90%+ statements, 85%+ branches)
- ✓ Production build
- ✓ Acceptance criteria verification
- ✓ Security review (part of code review)

---

## COMPARISON TO RALPH WIGGUM

Ralph Wiggum enables **autonomous code generation** for single developers.

Tech Lead Loop enables **autonomous feature delivery** for dev teams:

| Aspect           | Ralph Wiggum               | Tech Lead Loop                  |
| ---------------- | -------------------------- | ------------------------------- |
| **Use Case**     | Generate code autonomously | Orchestrate team of agents      |
| **Phases**       | Write → Test → Iterate     | Plan → Impl → Test → Review     |
| **Agents**       | Single Claude instance     | 5 specialized agents            |
| **Coordination** | Self-correcting loops      | Multi-agent handoffs            |
| **Completion**   | Completion promise         | All beads closed + committed    |
| **Output**       | Code + tests               | Complete feature + closed beads |

---

## NEXT STEPS

To use the autonomous workflow:

1. **Have a clear feature request** - "Add email notifications"
2. **Be ready to approve the plan** - Tech Lead will present it
3. **Be ready to approve commit** - Tech Lead will ask before shipping
4. **Run the loop**:
   ```bash
   /techlead-loop "Your feature description" --max-iterations 50
   ```
5. **Approve plan** - Reply "approved"
6. **Approve commit** - Reply "commit"
7. **Done!** - Feature is shipped, beads closed, code committed

---

## DOCUMENTATION FILES

**For reference:**

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - System design, agent roles, phases
- [`GOVERNANCE.md`](./GOVERNANCE.md) - Why only reviewer closes beads
- [`LOOP.md`](./LOOP.md) - This document
- [`.claude/agents/techlead.md`](../../.claude/agents/techlead.md) - Tech Lead agent definition
- [`.claude/agents/`](../../.claude/agents/) - All agent definitions
- [`.claude/skills/`](../../.claude/skills/) - Testing and design skills
- [`.claude/commands/`](../../.claude/commands/) - Available commands

---

## KEY INSIGHT

The system works because:

1. **Governance is enforced by design** - Only reviewer can close, prevents shortcuts
2. **Orchestration is automatic** - Tech Lead manages all handoffs
3. **Feedback is persistent** - Tech Lead reads its own previous work
4. **Progress is measurable** - Beads track state through all phases
5. **Issues are managed** - Reviewer finds problems, Tech Lead reassigns fixes

The result: **Reliable feature delivery without manual coordination.**

---

## GETTING STARTED

Ready to use it?

```bash
/techlead-loop "Add the feature you want"
```

The system will handle the rest.
