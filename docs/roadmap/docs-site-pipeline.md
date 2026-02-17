# Docs Site Build Pipeline

**Status:** In Progress (vamsa-j5xt)
**Created:** 2025-01-21
**Updated:** 2026-02-16

## Context

The docs/ folder has been audited and reorganized. Source documentation now lives in logical directories:

- `docs/guides/` - How-to guides, runbooks, operational docs
- `docs/adrs/` - Architecture Decision Records
- `docs/agentic/` - Multi-agent development architecture

## Decisions Made

1. **Tool: MkDocs Material** — Lightweight, Markdown-native, beautiful default theme, great for homelab/self-hosted project docs. Keeps doc build separate from app build (Python, not Node).

2. **ADRs: Published** — Transparency for contributors. All ADRs published under Architecture section.

3. **Ladle (component playground): Preserved** — Stays at `/components/` as a separate build, linked from MkDocs nav.

4. **GitHub Actions** — Build on push to main, deploy to GitHub Pages.

## Current State (after audit)

```
docs/
├── site/                    # Build output (GitHub Pages)
│   ├── components/          # Ladle build (chart playground)
│   ├── .nojekyll            # Bypass Jekyll processing
│   └── index.html           # Placeholder (will be replaced by MkDocs)
├── guides/                  # Source: consolidated guides
│   ├── alerts-runbook.md
│   ├── api.md
│   ├── architecture.md
│   ├── authentication.md
│   ├── backup-restore.md    # Consolidated from 4 BACKUP*.md files
│   ├── database-migrations.md
│   ├── deployment.md
│   ├── i18n.md
│   ├── integration-testing.md
│   └── quick-start-emails.md
├── adrs/                    # Source: Architecture decisions (001-013)
├── agentic/                 # Source: Multi-agent dev architecture
└── roadmap/                 # Internal proposals (this file)
```

## Remaining Tasks

- [x] Choose documentation tool → MkDocs Material
- [x] Audit and clean up docs/ folder
- [x] Consolidate scattered docs
- [x] Fix ADR numbering
- [x] Add .nojekyll for GitHub Pages
- [ ] Set up mkdocs.yml configuration
- [ ] Create MkDocs source directory structure
- [ ] Build scripts (docs:dev, docs:build)
- [ ] GitHub Actions workflow
- [ ] Write user-facing documentation (17 pages)
- [ ] Write developer/Claude Code documentation (8 pages)
- [ ] Landing page (index.md)
- [ ] Custom theme (earth tones)

## References

- Epic: vamsa-j5xt
- Beads: vamsa-j5xt.1 (audit), .2 (MkDocs setup), .3 (user docs), .4 (Claude Code docs)
