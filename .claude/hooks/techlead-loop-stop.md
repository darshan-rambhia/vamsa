# Tech Lead Loop Stop Hook

This hook intercepts the Tech Lead agent's exit attempt and checks for the feature completion signal.

## How It Works

When Tech Lead tries to exit a `/techlead-loop` session:

1. **Completion Check**
   - Hook looks for: `<promise>FEATURE_COMPLETE</promise>`
   - If found: Allow normal exit (work is complete)
   - If not found: Re-feed the entire conversation back to Tech Lead

2. **Iteration Increment**
   - Each time prompt is re-fed, iteration counter increases
   - Max iterations enforced (recommended: 50)
   - If max reached: Force exit to prevent infinite loops

3. **Feedback Mechanism**
   - Tech Lead sees its own previous work (modified files, git history)
   - Tech Lead reads its own comments and status updates
   - Tech Lead autonomously determines what to do next
   - This enables self-correction and progress

## Activation

Hook activates only when:
- User calls `/techlead-loop` command
- Tech Lead agent is in primary mode
- Tech Lead attempts to exit the session

## Completion Signal

Tech Lead outputs exactly:

```
<promise>FEATURE_COMPLETE</promise>
```

This tells the hook:
- ✓ Feature planning complete
- ✓ User approved plan
- ✓ Frontend implementation complete
- ✓ Backend implementation complete
- ✓ Testing complete with passing tests
- ✓ Review complete with all gates passing
- ✓ Beads closed by reviewer
- ✓ User approved commit
- ✓ Changes committed to git

If this signal is present → Hook allows exit immediately

## Example: Loop Iteration 1

```
User: /techlead-loop "Add email notifications"

Tech Lead (Iteration 1):
  [Analyzes requirements]
  [Creates beads]
  [Presents plan]

  Here's my plan for email notifications...
  Reply "approved" to proceed.

[Tech Lead tries to exit]
  ↓
[Hook checks for <promise>FEATURE_COMPLETE</promise>]
  ↓
[NOT found - iteration 1 of 50]
  ↓
[Hook re-feeds entire conversation back to Tech Lead]
  ↓

Tech Lead (Iteration 2):
  [Sees entire previous conversation]
  [Sees "approved" in user's message]
  [Realizes: User approved! Time to orchestrate agents]

  @frontend implement vamsa-123
  @backend implement vamsa-124
  [Polls status...]

[Tech Lead tries to exit]
  ↓
[Hook checks for completion signal]
  ↓
[NOT found - iteration 2 of 50]
  ↓
[Hook re-feeds conversation]
  ↓

Tech Lead (Iteration 3):
  [Sees both agents still working]
  [Checks bead status via bd show]
  [Polls again in 30 seconds]

[Repeat until...]
  ↓

Tech Lead (Iteration N):
  [Reviewer closed all beads]
  [User said "commit"]
  [Changes pushed to git]
  [Ready to exit]

  All work complete!
  <promise>FEATURE_COMPLETE</promise>

[Tech Lead tries to exit]
  ↓
[Hook checks for completion signal]
  ↓
[FOUND <promise>FEATURE_COMPLETE</promise>]
  ↓
[Hook allows exit]
  ↓

[Loop completes successfully]
```

## Error Handling

### Max Iterations Reached

If loop hits max iterations (default: 50):
- Hook logs error
- Loop exits with warning
- User can manually check status and resume

**Typical iteration counts:**
- Planning: 1-2 iterations
- Frontend implementation: 4-6 iterations (polling every 30s)
- Backend implementation: 4-6 iterations
- Testing: 3-5 iterations
- Review: 2-4 iterations
- Fixes (if needed): 2-4 iterations per issue
- Commit: 1 iteration
- **Total typical:** 15-25 iterations
- **With issues:** 25-35 iterations
- **Conservative limit:** 50 iterations

### Agent Timeout

If agent doesn't report ready within time limit:
- Tech Lead detects timeout (no status change for 120 min)
- Tech Lead notifies user
- Tech Lead can attempt re-invocation
- Loop continues until manual exit or completion

### Unexpected Exit

If Tech Lead exits without completion signal and under max iterations:
- Hook re-feeds prompt
- Tech Lead resumes from where it left off
- This enables recovery from transient errors

## Context Persistence

The stop hook mechanism preserves:
- ✓ All conversation history (user messages and agent responses)
- ✓ Modified files on disk (Tech Lead sees git changes)
- ✓ Git history (`git log` shows previous commits)
- ✓ Bead database (Tech Lead can check `bd show`)
- ✓ Agent status (Tech Lead can poll current state)

This allows Tech Lead to:
1. Understand what was accomplished in previous iterations
2. Determine what to do next
3. Recover from errors
4. Continue work autonomously

## Comparison to Ralph Wiggum

| Aspect | Ralph Wiggum | Tech Lead Loop |
| --- | --- | --- |
| Agent | Claude Code (single) | Tech Lead + subagents |
| Feedback | Modified files, test output | File changes, bead status, agent responses |
| Loop trigger | Stop hook on exit attempt | Stop hook on exit attempt |
| Completion signal | Custom promise text | `<promise>FEATURE_COMPLETE</promise>` |
| Typical iterations | 3-10 | 15-35 |
| Typical duration | 1-6 hours | 4-8 hours |
| Output | Code + test results | Complete feature + closed beads |

## Implementation Notes

This is a **self-referential feedback loop** enabled by the stop hook.

The magic of the system:
1. Tech Lead runs an iteration
2. Tries to exit
3. Hook detects incomplete work
4. Hook re-feeds the entire conversation
5. Tech Lead reads what it previously did
6. Tech Lead autonomously determines next steps
7. Tech Lead makes progress
8. Loop repeats until completion signal

This works because Claude maintains context across re-feeds and can:
- Understand previous work
- Identify blockers
- Adapt strategy
- Continue where it left off
- Reach completion autonomously

## User Experience

From user's perspective:

```
User: /techlead-loop "Add email notifications feature"

[Tech Lead works autonomously for 4-8 hours]
[Periodically outputs updates]

[After ~30 iterations]

Tech Lead: All work complete!
<promise>FEATURE_COMPLETE</promise>

[Loop exits]

User: Feature is done! All beads closed, code committed.
```

Compare to manual approach where user must coordinate 10+ agent invocations manually.

---

## See Also

- `.claude/commands/techlead-loop.md` - Command usage and examples
- `.opencode/agent/techlead.md` - Enhanced system prompt with orchestration logic
- `ARCHITECTURE.md` - System design concepts
