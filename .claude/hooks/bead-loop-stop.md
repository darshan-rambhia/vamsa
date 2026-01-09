# Bead Loop Stop Hook

This hook intercepts the Tech Lead agent's exit attempt during `/bead-loop` sessions and checks for the completion signal.

## How It Works

When Tech Lead tries to exit a `/bead-loop` session:

1. **Completion Check**
   - Hook looks for: `<promise>BEAD_LOOP_COMPLETE</promise>`
   - If found: Allow normal exit (all beads processed)
   - If not found: Re-feed the entire conversation back to Tech Lead

2. **Iteration Increment**
   - Each time prompt is re-fed, iteration counter increases
   - Max iterations enforced (recommended: 100 for multi-bead processing)
   - If max reached: Force exit to prevent infinite loops

3. **Feedback Mechanism**
   - Tech Lead sees its own previous work (modified files, git history)
   - Tech Lead reads bead status via `bd show`
   - Tech Lead autonomously determines what to do next
   - This enables self-correction and progress across multiple beads

## Activation

Hook activates only when:

- User calls `/bead-loop` command
- Tech Lead agent is in primary mode
- Tech Lead attempts to exit the session

## Completion Signal

Tech Lead outputs exactly:

```
<promise>BEAD_LOOP_COMPLETE</promise>
```

This tells the hook:

- ✓ All filtered beads have been processed
- ✓ Each bead was enriched with implementation details
- ✓ Implementation agents completed their work
- ✓ Tester wrote tests for each bead
- ✓ Reviewer ran ALL quality gates for each bead:
  - ✓ pnpm test passed
  - ✓ pnpm lint passed
  - ✓ pnpm typecheck passed
  - ✓ pnpm build succeeded
  - ✓ pnpm dev started successfully
  - ✓ docker build succeeded
  - ✓ docker run verified container works
- ✓ All beads closed by reviewer
- ✓ No more beads to process

If this signal is present → Hook allows exit immediately

## Loop Flow

```
User: /bead-loop --filter "Port" --max-iterations 100

Tech Lead (Iteration 1):
  [Lists available beads via bd ready]
  [Selects highest priority bead]
  [Presents to user]
  [Waits for "proceed"]

[Tech Lead tries to exit]
  ↓
[Hook checks for <promise>BEAD_LOOP_COMPLETE</promise>]
  ↓
[NOT found - iteration 1 of 100]
  ↓
[Hook re-feeds entire conversation back to Tech Lead]
  ↓

Tech Lead (Iteration 2):
  [Sees user said "proceed"]
  [Enriches bead with implementation details]
  [Delegates to @backend]
  [Polls status...]

[Tech Lead tries to exit]
  ↓
[Hook checks - NOT found - iteration 2]
  ↓
[Hook re-feeds]
  ↓

Tech Lead (Iteration 3-N):
  [Monitors backend → frontend → tester → reviewer]
  [Each phase may take multiple iterations]
  [Handles issues if reviewer reports problems]

[Eventually...]

Tech Lead (Iteration M):
  [First bead closed by reviewer]
  [Selects next bead]
  [Continues loop...]

[Repeat for each bead...]

Tech Lead (Final Iteration):
  [All filtered beads are closed]
  [No more beads to process]

  All beads complete!
  <promise>BEAD_LOOP_COMPLETE</promise>

[Tech Lead tries to exit]
  ↓
[Hook checks - FOUND <promise>BEAD_LOOP_COMPLETE</promise>]
  ↓
[Hook allows exit]
  ↓

[Loop completes successfully]
```

## Iteration Estimates

For processing N beads:

| Phase | Iterations per bead |
|-------|---------------------|
| Selection & enrichment | 2-3 |
| Backend implementation | 3-5 |
| Frontend implementation | 3-5 |
| Testing | 2-4 |
| Review (all gates) | 3-6 |
| Issue resolution | 0-5 (if issues found) |
| **Subtotal per bead** | **13-28** |

**For 14 "Port" beads:**
- Minimum: 14 × 13 = 182 iterations
- Typical: 14 × 20 = 280 iterations
- With issues: 14 × 25 = 350 iterations

**Recommendation**: Set `--max-iterations 500` for large bead batches

## Quality Gate Verification

The reviewer agent must verify ALL of these pass before closing any bead:

```bash
# Core quality gates
pnpm test           # Unit tests must pass
pnpm lint           # No lint errors
pnpm typecheck      # No type errors
pnpm build          # Build must succeed

# Runtime verification
pnpm dev &          # Dev server must start
sleep 10            # Wait for server
curl localhost:3000 # Must respond

# Docker verification
docker build -t vamsa-test -f docker/Dockerfile .
docker run --rm -d -p 3001:3000 --name vamsa-test-container vamsa-test
sleep 15
curl localhost:3001 # Container must respond
docker stop vamsa-test-container
```

**If ANY command fails, bead CANNOT be closed.**

## Error Handling

### Max Iterations Reached

If loop hits max iterations:

- Hook logs error
- Loop exits with warning
- Remaining beads stay open
- User can resume later with `/bead-loop` again

### Agent Timeout

If agent doesn't report ready within time limit:

- Tech Lead detects timeout
- Tech Lead can skip to next bead
- Skipped bead remains open for later

### Docker Failures

If docker commands fail:

- Reviewer reports issue
- Tech Lead identifies fix (usually Dockerfile or build config)
- Loop continues after fix

### User Interruption

If user says "stop" or "cancel":

- Tech Lead exits gracefully
- Current bead may remain in_progress
- Can resume later

## Context Persistence

The stop hook mechanism preserves:

- ✓ All conversation history
- ✓ Modified files on disk
- ✓ Git history
- ✓ Bead database (`bd show` reflects current state)
- ✓ Docker images built during session

This allows Tech Lead to:

1. Remember which beads were already completed
2. Resume from where it left off
3. Recover from transient errors
4. Process beads autonomously

## Differences from techlead-loop-stop

| Aspect | techlead-loop-stop | bead-loop-stop |
|--------|-------------------|----------------|
| **Signal** | `FEATURE_COMPLETE` | `BEAD_LOOP_COMPLETE` |
| **Scope** | Single feature | Multiple beads |
| **Quality gates** | Standard | Comprehensive + Docker |
| **Typical iterations** | 15-35 | 50-500 |
| **Completion trigger** | Feature done | All beads done |

## User Experience

From user's perspective:

```
User: /bead-loop --filter "Port" --max-iterations 500

[Tech Lead presents first bead]
User: proceed

[Tech Lead works autonomously...]
[Periodically outputs status updates]
[Pauses for user input between beads]

[After all beads processed]

Tech Lead: All beads complete!
<promise>BEAD_LOOP_COMPLETE</promise>

[Loop exits]

User: All Port beads are done! Ready for web-legacy deletion.
```

## Recovery Commands

If loop needs manual intervention:

```bash
# Check current bead status
bd ready
bd show {bead-id}

# Manually close a bead (if gates passed externally)
bd close {bead-id} --reason "Manually verified"

# Skip a problematic bead
bd update {bead-id} --priority 4  # Move to backlog

# Resume loop
/bead-loop --filter "Port"
```

---

## See Also

- `.claude/commands/bead-loop.md` - Command usage and examples
- `.claude/agents/reviewer.md` - Comprehensive review requirements
- `.claude/hooks/techlead-loop-stop.md` - Feature loop stop hook
