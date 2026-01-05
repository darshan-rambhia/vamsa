# /techlead-loop Command

Autonomous feature delivery loop for the Tech Lead agent. Orchestrates all agents (frontend, backend, tester, reviewer) through their complete lifecycle.

## Usage

```bash
/techlead-loop "Feature description" [--max-iterations <n>] [--completion-promise "<text>"]
```

## Parameters

- `<feature-description>` - Description of the feature to implement (required)
- `--max-iterations <n>` - Maximum iterations before timeout (recommended: 50, prevents infinite loops)
- `--completion-promise "<text>"` - Signal text to exit loop (default: "FEATURE_COMPLETE")

## Example

```bash
/techlead-loop "Add email notifications when users make suggestions" --max-iterations 50 --completion-promise "FEATURE_COMPLETE"
```

## How It Works

The Tech Lead agent runs in a self-referential loop:

1. **Iteration 1 (Analysis & Planning)**
   - Tech Lead analyzes the feature request
   - Creates epic + implementation beads
   - Presents plan to user
   - Waits for user to say "approved"
   - Since "approved" not found, loop continues

2. **Iteration 2+ (Orchestration)**
   - Tech Lead checks if user approved (looks for "approved" in conversation)
   - If approved: Invokes @frontend and @backend in parallel
   - Polls bead status every 30 seconds via `bd show`
   - When both report `ready`: Invokes @tester
   - Monitors tester progress
   - When tester reports `ready`: Invokes @reviewer
   - Monitors reviewer progress
   - If reviewer closes beads: Asks user "Ready to commit?"
   - If issues found: Identifies responsible agent, reassigns, re-invokes reviewer
   - Loop continues until completion promise is output

3. **Final Iteration (Completion)**
   - Tech Lead outputs: `<promise>FEATURE_COMPLETE</promise>`
   - Stop hook detects this exact string
   - Loop exits
   - User can now see all completed work

## Stop Hook

The system includes a stop hook that:

- Checks for `<promise>FEATURE_COMPLETE</promise>` in output
- If found: Allows normal exit (work is complete)
- If not found: Re-feeds the entire prompt to Tech Lead
- Enforces `--max-iterations` limit for safety

## Agent Invocation Sequence

```
Iteration 1: Planning
  ├─ Analyze feature
  ├─ Create beads
  ├─ Present plan
  └─ Wait for approval

Iteration 2+: Orchestration (after "approved")
  ├─ Invoke @frontend and @backend (parallel)
  ├─ Poll both until ready (max 120 min)
  ├─ Invoke @tester
  ├─ Poll tester until ready (max 120 min)
  ├─ Invoke @reviewer
  ├─ Poll reviewer until beads closed (max 30 min)
  │  ├─ If issues found:
  │  │  ├─ Identify responsible agent
  │  │  ├─ Reassign bead
  │  │  ├─ Re-invoke @reviewer
  │  │  └─ Loop until all pass
  │  └─ If all pass: Ask user to commit
  ├─ After user says "commit": Commit changes
  └─ Output completion promise

Loop: Exits when <promise>FEATURE_COMPLETE</promise> found or max-iterations reached
```

## Status Polling

Tech Lead polls bead status using:

```bash
bd show {bead-id}  # Check status field for: open, in_progress, ready, closed
```

Polling strategy:

- Check status every 30 seconds
- Timeout per phase: 120 minutes (frontend/backend), 120 minutes (tester), 30 minutes (reviewer)
- If timeout occurs, notify user of stalled agent

## Issue Resolution Loop

If reviewer finds issues:

```
Reviewer: bd comment {bead-id} --body "Issues found: ..."
  ↓
Tech Lead: Reads comments
  ↓
Tech Lead: Identifies responsible agent:
  - UI/components/pages → @frontend
  - Server actions/schemas/database → @backend
  - Tests/coverage → @tester
  ↓
Tech Lead: bd assign {bead-id} @{agent-name}
  ↓
Tech Lead: @{agent-name} - Issues found. See {bead-id} comments.
  ↓
Agent: Fixes issues → bd status ready
  ↓
Tech Lead: @reviewer review {bead-id}
  ↓
Reviewer: Validates → closes or reports new issues
  ↓
Loop: Repeat until all pass
```

## Success Criteria

Loop exits successfully when Tech Lead outputs:

```
<promise>FEATURE_COMPLETE</promise>
```

This indicates:

- ✓ All beads created
- ✓ User approved plan
- ✓ Frontend implemented and reported ready
- ✓ Backend implemented and reported ready
- ✓ Tester wrote tests and reported ready
- ✓ Reviewer ran all quality gates and closed beads
- ✓ User approved commit
- ✓ Changes committed to git

## Failure Scenarios

Loop exits with failure if:

1. **Max iterations reached** - Feature took too long, likely stalled agent
   - Check which agent was last working
   - Manually invoke that agent to resume

2. **Agent timeout** - Agent didn't report ready within time limit
   - Check `bd show {bead-id}` to see current status
   - Manually invoke agent if needed

3. **User interruption** - User says "cancel" or "stop"
   - Tech Lead should exit gracefully
   - All beads remain in their current state
   - Can resume later by manually invoking agents

## Example Session

```
User: /techlead-loop "Add email notifications" --max-iterations 50

Tech Lead (Iteration 1):
  Analyzing feature request...
  Creating beads...

  ## Plan: Email Notifications Feature

  ### Beads Created
  - vamsa-epic-123: Email notifications for suggestions
  - vamsa-frontend-124: UI for notification preferences
  - vamsa-backend-125: Email service + database model

  ### Acceptance Criteria
  - [ ] User receives email when suggestion created
  - [ ] User can disable notifications in settings
  - [ ] Professional email template with unsubscribe link

  Reply "approved" to proceed, or provide feedback.

User: approved

Tech Lead (Iteration 2+):
  Plan approved! Invoking agents...

  @frontend implement vamsa-frontend-124
  @backend implement vamsa-backend-125

  Waiting for implementations... checking status every 30 seconds.

Tech Lead (Iteration 3+):
  Frontend status: in_progress
  Backend status: in_progress

Tech Lead (Iteration 4+):
  Frontend status: ready ✓
  Backend status: ready ✓

  Both implementations complete! Invoking tester...

  @tester write tests for vamsa-epic-123

  Waiting for tests... checking status every 30 seconds.

Tech Lead (Iteration 5+):
  Tester status: ready ✓
  Coverage: Statements 94%, Branches 88%, Functions 96%, Lines 94%

  Tests complete! Invoking reviewer...

  @reviewer review vamsa-epic-123

  Waiting for review... checking status every 30 seconds.

Tech Lead (Iteration 6+):
  Reviewer status: closed ✓
  All quality gates passed!

  Ready to commit?

User: commit

Tech Lead (Iteration 7+):
  Committing changes...
  git add .
  git commit -m "feat: add email notifications..."
  bd sync
  git push

  <promise>FEATURE_COMPLETE</promise>

Loop exits. Feature complete!
```

## Comparison: Manual vs Loop

### Manual Approach (Current)

```
User → Tech Lead: "Add feature"
Tech Lead: Creates beads, presents plan
User: "approved"
User: "@frontend implement vamsa-123"
User: (waits, monitors bd show vamsa-123)
User: "@backend implement vamsa-124"
User: (waits, monitors bd show vamsa-124)
User: (when both ready) "@tester write tests"
User: (waits, monitors bd show vamsa-epic)
User: (when ready) "@reviewer review vamsa-epic"
User: (waits, monitors for closure)
User: Tech Lead commits
```

**Time:** User must manually coordinate all handoffs
**Effort:** High - requires constant monitoring

### Loop Approach (New)

```
User: /techlead-loop "Add feature"
Tech Lead: Creates beads, presents plan
User: "approved"
Tech Lead: Orchestrates ALL agents automatically
Tech Lead: Monitors status, handles issues, coordinates fixes
Tech Lead: Commits changes when ready
Tech Lead: Outputs completion promise
Loop: Exits
```

**Time:** Fully autonomous orchestration
**Effort:** Zero - user just approves plan and waits

## Tech Lead System Prompt Updates

The Tech Lead agent's system prompt is enhanced with:

1. **Loop Detection** - Understand when running in loop mode
2. **Status Polling** - Instructions on checking `bd show` every 30 seconds
3. **Automatic Invocation** - When to invoke each agent
4. **Issue Management** - How to identify and reassign issues
5. **Completion Signal** - When to output the completion promise

See: `.opencode/agent/techlead.md` for full updated prompt.

## Requirements

- `bd` (beads CLI) - Must be installed and configured
- All agent configs in `.opencode/agent/` - Must be present
- Stop hook - Must be configured to detect completion promise
- Permissions - Tech Lead must have permission for `bd *` and `bun run *` commands

## Troubleshooting

### Loop seems stuck (iterations keep increasing)

Check:

1. Did user say "approved"? Tech Lead is waiting for this.
2. Check bead status: `bd show {bead-id}` - Is agent actually working?
3. Check agent logs to see what they're doing
4. If agent is stuck, manually invoke them again
5. Loop will continue polling until agent reports ready

### Agent didn't start

Check:

1. Did Tech Lead actually invoke the agent? Look for `@agent-name` mention
2. Check if agent config exists in `.opencode/agent/`
3. Check permissions - agent may not have access to required commands

### Agent is working but loop keeps polling

This is normal! Loop continues until agent reports status `ready`.

- Agent typically reports within 1-2 hours for implementation
- Loop keeps polling, Tech Lead is patient

### Want to manually intervene

You can:

1. Manually invoke any agent: `@agent-name do-something`
2. Manually update bead status: `bd status {id} ready`
3. Tech Lead will see the change on next poll and continue

### Want to exit loop early

Say: "cancel" - Tech Lead will exit gracefully without completing the loop.

---

## See Also

- `ARCHITECTURE.md` - System design and concepts
- `WORKFLOW.md` - Manual workflow reference
- `GOVERNANCE.md` - Why only reviewer closes beads
- `.opencode/agent/techlead.md` - Tech Lead system prompt with orchestration logic
