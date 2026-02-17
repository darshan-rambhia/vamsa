# Multi-Agent Workflow Plugin Design

Can `/techlead-loop` be converted into a reusable Claude Code plugin for other repositories?

**Short answer: YES, but with significant caveats.**

---

## WHAT CAN BE REUSED

### The Core Loop Mechanism

```
✓ Stop hook pattern (detects completion promise, re-feeds prompt)
✓ Orchestration logic (invoke agents → poll status → advance phases)
✓ Polling mechanism (check status every 30 seconds)
✓ Issue resolution loop (reassign agents on failure)
```

This pattern is **generic** and can work in any multi-agent system.

### Ralph Wiggum Plugin Pattern

Ralph Wiggum already demonstrates this:

```
/ralph-loop "prompt" --max-iterations 50 --completion-promise "COMPLETE"
```

Your `/techlead-loop` could follow the same pattern:

```
/techlead-loop "feature description" --max-iterations 50
```

---

## WHAT CANNOT BE REUSED (Project-Specific)

### 1. Agent Configurations

Your agents are specific to Vamsa:

```
.opencode/agent/
├── techlead.md      ← Vamsa-specific system prompt
├── frontend.md      ← Uses shadcn/ui, Next.js patterns
├── backend.md       ← Uses Prisma, Zod, your auth patterns
├── tester.md        ← Uses Bun, Vitest, Playwright config
└── reviewer.md      ← Knows your quality gate commands
```

**Problem:** Every project has different:

- Tech stack (your project: Next.js + Bun + Prisma)
- Quality gates (your thresholds: 90% coverage)
- Conventions (your patterns: Server Actions, shadcn/ui)
- Models and architecture (your unique patterns)

**Solution:** Make agents **configurable** by project, not hardcoded.

### 2. Beads System

You're using `bd` (beads) for issue tracking:

```bash
bd create "Epic: ..." --type epic
bd show {bead-id}
bd status {bead-id} ready
bd close {bead-id}
```

**Problem:** Not every project uses beads. Some use:

- GitHub Issues
- Linear
- Jira
- Custom systems

**Solution:** Make the backend pluggable (beads vs. GitHub Issues vs. others).

### 3. Quality Gates Commands

Your project runs:

```bash
bun run format
bun run typecheck
bun run lint
bun run build
bun run test:run
bun run test:coverage
bun run test:e2e
bunx prisma validate
bunx prisma migrate dev
```

**Problem:** Different projects have different commands:

- Python projects: `black`, `mypy`, `pytest`
- Rust projects: `cargo fmt`, `cargo test`
- Go projects: `go fmt`, `go test`
- Monorepos: Different build commands per package

**Solution:** Make quality gate commands configurable per project.

### 4. Tech Stack Dependencies

Your agents know about:

- Next.js 15 (App Router, Server Components)
- Prisma ORM
- Zod for validation
- shadcn/ui components
- NextAuth
- TanStack Query
- React Flow

**Problem:** Other projects use different stacks (Django, Rails, Spring, etc.)

**Solution:** Make agents configurable to different tech stacks.

---

## PLUGIN ARCHITECTURE

Here's how to design a reusable plugin:

### Core (Reusable)

```
plugins/multi-agent-workflow/
├── .claude-plugin/
│   └── manifest.json         # Plugin metadata
├── commands/
│   └── orchestrate-loop.md   # Generic orchestration command
├── hooks/
│   └── loop-stop.md          # Generic stop hook
├── lib/
│   ├── orchestrator.js       # Phase management logic
│   ├── poller.js             # Status polling logic
│   └── issue-resolver.js     # Issue resolution logic
└── README.md
```

### Project-Specific Configuration

```
project-root/.claude/
├── config.json               # Plugin configuration (NEW)
│   ├── issue_system: "beads|github|jira"
│   ├── quality_gates: [commands to run]
│   ├── agents: [custom agent definitions]
│   └── tech_stack: {details}
└── agents/
    ├── orchestrator.md       # Project-specific orchestrator
    └── ... (other agents)
```

---

## THREE IMPLEMENTATION OPTIONS

### Option A: Pure Plugin (Plug-and-Play)

**Pros:**

- Zero config needed
- Works immediately
- Easy to distribute

**Cons:**

- Only works for projects exactly like Vamsa
- No customization

**Scope:** 10% of projects (only Vamsa-like tech stacks)

**Effort:** Already done (you have it!)

### Option B: Configurable Plugin (Recommended)

**Pros:**

- Works for multiple tech stacks
- Configurable per project
- Reusable across projects

**Cons:**

- Requires configuration
- More complex plugin code

**Scope:** 50-60% of projects (different stacks, but structured teams)

**Effort:** 2-3 days of work

**How it works:**

```yaml
# .claude/config.json
{
  "issue_system": "beads", # or "github", "jira"
  "agents":
    {
      "orchestrator": "claude-opus-4-5",
      "frontend": "gemini-2.5-pro",
      "backend": "claude-haiku-4-5",
      "tester": "claude-haiku-4-5",
      "reviewer": "claude-opus-4-5",
    },
  "quality_gates":
    [
      "npm run format",
      "npm run typecheck",
      "npm run lint",
      "npm run build",
      "npm run test",
    ],
  "tech_stack":
    {
      "language": "typescript",
      "framework": "next.js",
      "orm": "prisma",
      "testing": "vitest+playwright",
    },
}
```

The plugin reads this config and customizes behavior.

### Option C: Framework (Extensible)

**Pros:**

- Works for any project
- Full customization
- Educational value

**Cons:**

- Very complex
- Requires deep documentation
- Steep learning curve

**Scope:** 100% of projects

**Effort:** 1-2 weeks of work

---

## MY RECOMMENDATION: Option B (Configurable Plugin)

### Why?

1. **Balanced** - Reuses your logic, adapts to other projects
2. **Practical** - Covers 50-60% of teams using structured workflows
3. **Effort** - Achievable in 2-3 days
4. **Distribution** - Can be shared on GitHub/npm
5. **Your use case** - You keep using Vamsa version, others customize

### Implementation Plan

**Week 1:**

1. Create plugin scaffold

   ```
   plugins/multi-agent-workflow/
   ```

2. Extract generic orchestration logic
   - Phase management
   - Status polling
   - Issue resolution

3. Make issue system pluggable
   - Abstract `bd show/close/status` commands
   - Support GitHub Issues, Linear, Jira adapters

4. Make quality gates configurable
   - Read from `.claude/config.json`
   - Execute configured commands

**Week 2:**

5. Make agents configurable
   - Read agent names/models from config
   - Generate agent system prompts from templates

6. Document configuration format
   - Schema for config.json
   - Examples for different tech stacks

7. Create setup script
   - Initialize plugin in existing project
   - Generate config.json from prompts

**Week 3:**

8. Test with 2-3 different projects
9. Polish documentation
10. Release v1.0

---

## COMPARISON: Available Now vs Plugin

### Today (Vamsa Only)

```bash
/techlead-loop "Add email notifications"
```

Works perfectly for Vamsa because:

- Agents know your patterns
- Quality gates match your setup
- Beads system is installed
- Tech stack is known

**Limitation:** Only works in Vamsa repo

### With Plugin (Any Project)

```bash
# Install plugin
claude-code plugin install multi-agent-workflow

# Configure for your project
cp plugin-config-template.json .claude/config.json
# Edit .claude/config.json with your tech stack

# Use it
/orchestrate-loop "Add feature X"
```

Works for any project because:

- Agents generated from config
- Quality gates from config
- Issue system from config
- Tech stack from config

**Advantage:** Works in any repo with minimal setup

---

## REQUIRED FILES FOR PLUGIN

### For Vamsa (Current State)

```
.claude/
├── commands/techlead-loop.md
├── hooks/techlead-loop-stop.md
.opencode/agent/
├── techlead.md
├── frontend.md
├── backend.md
├── tester.md
├── reviewer.md
```

### For Plugin (Reusable)

```
plugins/multi-agent-workflow/
├── .claude-plugin/manifest.json
├── commands/orchestrate.md
├── hooks/loop-stop.md
├── lib/
│   ├── orchestrator.js
│   ├── poller.js
│   ├── issue-resolver.js
│   └── config-loader.js
├── templates/
│   ├── agent-orchestrator.md.template
│   ├── agent-frontend.md.template
│   ├── agent-backend.md.template
│   └── config.schema.json
├── adapters/
│   ├── beads-adapter.js
│   ├── github-adapter.js
│   └── linear-adapter.js
├── init.js                        (setup script)
└── README.md
```

---

## WHAT YOU SHOULD DO NEXT

### Option 1: Stay Focused on Vamsa (Recommended Now)

1. **Test `/techlead-loop` in Vamsa** ✓ (You want to do this)
2. Refine based on real usage
3. Document patterns that work well
4. Build plugin later once you know what works

**Timeline:** Start plugin in 2-3 weeks after testing

### Option 2: Design Plugin in Parallel

1. Test `/techlead-loop` in Vamsa
2. Document what's generic vs. project-specific
3. Sketch config.json schema
4. Create plugin scaffold
5. Refactor Vamsa to use plugin config
6. Test plugin with another project

**Timeline:** 3-4 weeks

---

## VERDICT

**Can it be a plugin? YES**

**Should you do it now? NO - Test first**

**Why?**

The `/techlead-loop` is new and untested. Before building a plugin:

1. ✓ Run it in Vamsa (get real feedback)
2. ✓ Understand what works and what breaks
3. ✓ Identify patterns that are truly generic
4. ✓ Find edge cases and limitations
5. **THEN** design the plugin

You'll make better decisions after real usage.

---

## ROUGH TIMELINE: If You Decide to Build Plugin

```
Week 1 (Vamsa Testing)
  ├─ Run /techlead-loop with real feature
  ├─ Document issues/improvements
  ├─ Refine tech lead orchestration logic
  └─ Get feedback from actual usage

Week 2-3 (Plugin Design)
  ├─ Document generic vs. project-specific code
  ├─ Design config.json schema
  ├─ Extract orchestration logic to lib/
  ├─ Create issue system adapters
  └─ Sketch agent templates

Week 4-5 (Plugin Implementation)
  ├─ Build plugin scaffold
  ├─ Implement config loading
  ├─ Create adapters (beads, GitHub, etc.)
  ├─ Generate agents from templates
  ├─ Setup script
  └─ Documentation

Week 6-7 (Testing & Polish)
  ├─ Test with 2-3 different projects
  ├─ Polish documentation
  ├─ Create examples
  ├─ Version 1.0 release
  └─ GitHub/npm distribution
```

**Total:** 6-7 weeks to production-ready plugin

---

## My Advice

1. **Right now:** Test `/techlead-loop` with a real Vamsa feature
2. **After testing:** Assess if plugin is worth the effort
3. **If yes:** Follow Option B (Configurable Plugin)
4. **If no:** Keep it Vamsa-specific, still useful!

The loop mechanism is solid. Now you need to validate it works in practice before scaling it to a plugin.

---

## Next Steps

Want to:

1. **Test `/techlead-loop` now?** (Recommended) ← Do this first
2. **Start plugin design?** I can help design the architecture
3. **Hybrid approach?** Test + design in parallel

What's your preference?
