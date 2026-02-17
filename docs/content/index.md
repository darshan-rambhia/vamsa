# Vamsa

**A private, self-hosted family tree application.**

Vamsa helps families preserve their history in a beautiful, private genealogy platform that you own and control. No cloud subscriptions, no data mining — just your family's story, hosted on your terms.

---

## What You Can Do

- **Build your family tree** with an interactive visual editor supporting multiple chart types
- **Store photos and documents** attached to people in your tree
- **Import existing data** from GEDCOM files (Gramps, Ancestry, FamilySearch)
- **Invite family members** with role-based access (Admin, Member, Viewer)
- **Export everything** as GEDCOM, ZIP archives, or calendar feeds
- **Automatic backups** keep your data safe with configurable retention
- **Optional AI features** for smart suggestions and relationship hints

## Get Started

<div class="grid cards" markdown>

- :material-download: **[Installation](getting-started/installation.md)**

    Get Vamsa running on Docker, Raspberry Pi, bare metal, or cloud hosting.

- :material-rocket-launch: **[Quick Start](getting-started/quick-start.md)**

    Your first 10 minutes — add people, relationships, and photos.

- :material-cog: **[Configuration](getting-started/configuration.md)**

    Customize authentication, email, backups, and monitoring.

- :material-book-open-variant: **[User Guides](guides/index.md)**

    Learn every feature in detail.

</div>

## For Developers

Vamsa is open source and built with an innovative AI-assisted development workflow using Claude Code.

<div class="grid cards" markdown>

- :material-robot: **[Claude Code Overview](developer/claude-code-overview.md)**

    How we build Vamsa with a multi-agent AI development team.

- :material-source-branch: **[Architecture](architecture/index.md)**

    System design, API reference, and architecture decisions.

</div>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TanStack Start (React + Vite) |
| Backend | TanStack Server Functions |
| Database | PostgreSQL (Drizzle ORM) |
| Runtime | Bun |
| UI | shadcn/ui |
| Auth | Better Auth |
| Testing | Vitest + Playwright |
