# Docs Site Build Pipeline

**Status:** Proposed
**Created:** 2025-01-21

## Context

Currently, `docs/site/` contains:
- Storybook component library (built)
- Empty `guides/` and `api/` placeholders

Source documentation lives in:
- `docs/guides/` - How-to guides, runbooks, API reference
- `docs/adrs/` - Architecture Decision Records

We want `docs/site/` to grow into a full documentation site hosted on GitHub Pages, without duplicating content between source and published locations.

## Proposal

Set up a build pipeline that transforms source markdown into the published site:

```
docs/guides/*.md     →  (build)  →  docs/site/guides/*.html
docs/adrs/*.md       →  (build)  →  docs/site/adrs/*.html (optional)
```

## Current State

```
docs/
├── site/              # Build output (GitHub Pages)
│   ├── components/    # Storybook build
│   ├── guides/        # Empty
│   ├── api/           # Empty
│   └── index.html
├── adrs/              # Source: Architecture decisions
├── guides/            # Source: How-to guides
└── roadmap/           # In-progress proposals (this file)
```

## Desired End State

```
docs/
├── site/              # Build output (GitHub Pages) - gitignored except components
│   ├── components/    # Storybook build
│   ├── guides/        # Built from docs/guides/
│   ├── adrs/          # Built from docs/adrs/ (if we want them public)
│   ├── api/           # Built API reference
│   └── index.html     # Landing page
├── adrs/              # Source: Architecture decisions
├── guides/            # Source: How-to guides
└── roadmap/           # In-progress proposals
```

## Open Questions

1. **Which tool to use?**
   - [mdBook](https://rust-lang.github.io/mdBook/) - Rust, simple, good for technical docs
   - [MkDocs](https://www.mkdocs.org/) - Python, Material theme popular
   - [Docusaurus](https://docusaurus.io/) - React-based, feature-rich
   - Simple script - Just copy/convert markdown to HTML

2. **Should ADRs be published to the site?**
   - Pro: Transparency, helps contributors understand decisions
   - Con: Some ADRs may be internal-only

3. **How to handle the existing Storybook?**
   - Keep as separate build (`/components/`)
   - Integrate into doc site navigation

4. **GitHub Actions workflow?**
   - Build on push to main
   - Deploy to GitHub Pages

## Tasks

- [ ] Choose documentation tool
- [ ] Set up basic build configuration
- [ ] Create landing page (`index.html` or `index.md`)
- [ ] Configure GitHub Actions for automated builds
- [ ] Add navigation/sidebar structure
- [ ] Integrate with existing Storybook build
- [ ] Update `.gitignore` for build outputs

## References

- Current guides: `/docs/guides/`
- Current ADRs: `/docs/adrs/`
- Storybook: `/docs/site/components/`
