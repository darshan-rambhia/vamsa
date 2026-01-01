# Family Tree Webapp - Planning Document

## 1. Overview

A web application for managing family genealogy data with:

- Individual profiles with comprehensive personal information
- Generational linkages (parent-child, spouse relationships)
- Role-based access control for family members
- Suggestion/approval workflow for data modifications

---

## 2. Tech Stack Decision

### Recommended Stack

| Layer                       | Technology                               | Rationale                                                        |
| --------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| **Framework**               | Next.js 14+ (App Router)                 | Full-stack React, single language (TypeScript), excellent DX     |
| **Language**                | TypeScript                               | Type safety, better DX, fewer runtime errors                     |
| **Runtime/Package Manager** | Bun                                      | Faster installs (10-25x), faster scripts, built-in TS support    |
| **Data Mutations**          | Server Actions                           | Next.js native, type-safe mutations, no API routes needed        |
| **Client Caching**          | TanStack Query v5                        | Caching, optimistic updates, background refetching               |
| **Validation**              | Zod                                      | Runtime validation, shared schemas for actions + forms           |
| **Database**                | PostgreSQL (default) + SQLite (optional) | Postgres for production, SQLite for simple deployments           |
| **ORM**                     | Prisma                                   | Type-safe queries, migrations, supports both Postgres and SQLite |
| **Auth**                    | NextAuth.js (Auth.js)                    | Email/password + pluggable OIDC for bring-your-own-provider      |
| **UI Framework**            | Tailwind CSS + shadcn/ui                 | Utility-first CSS + accessible, customizable components          |
| **Tree Visualization**      | React Flow                               | Interactive vertical family tree rendering                       |
| **File Storage**            | Local (Docker volume)                    | Pluggable storage adapter for S3/cloud later                     |
| **Containerization**        | Docker Compose                           | webapp + postgres (or sqlite volume)                             |

### Why NOT Other Options?

| Alternative      | Reason to Skip                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| MongoDB/NoSQL    | Family trees are inherently relational (parent→child, spouse↔spouse). Graph-like queries awkward in document stores |
| Neo4j (Graph DB) | Overkill for this scale, adds operational complexity                                                                |
| Remix/SvelteKit  | Good options, but Next.js has larger ecosystem and confirmed preference                                             |
| npm/yarn         | Bun is faster for installs and scripts, with full Next.js compatibility                                             |

### Database Choice: Supporting Both

**PostgreSQL (default)** - Recommended for:

- Multi-user families (concurrent edits)
- Larger trees (1000+ people)
- Production deployments
- Advanced queries (recursive CTEs for ancestor chains)

**SQLite (optional)** - Good for:

- Single-family simple deployments
- Self-hosted on low-resource machines
- Development/testing
- < 50 concurrent users

**Implementation:** Single Prisma schema, switch via `DATABASE_URL` env var. Schema avoids Postgres-specific features to maintain compatibility.

---

## 3. Data Model Design

### Core Entities

```uml
┌─────────────────────────────────────────────────────────────────┐
│                           Person                                │
├─────────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                                   │
│ firstName: String                                               │
│ lastName: String                                                │
│ maidenName: String? (for those who changed name after marriage) │
│ dateOfBirth: Date?                                              │
│ dateOfPassing: Date? (respectful terminology)                   │
│ birthPlace: String?                                             │
│ nativePlace: String?                                            │
│ gender: Enum (Male, Female, Other, PreferNotToSay)              │
│ photoUrl: String?                                               │
│ bio: Text?                                                      │
│                                                                 │
│ # Contact Info                                                  │
│ email: String?                                                  │
│ phone: String?                                                  │
│ currentAddress: JSON?                                           │
│ workAddress: JSON?                                              │
│                                                                 │
│ # Professional                                                  │
│ profession: String?                                             │
│ employer: String?                                               │
│                                                                 │
│ # Social                                                        │
│ socialLinks: JSON? (flexible: {facebook, linkedin, etc})        │
│                                                                 │
│ # Metadata                                                      │
│ createdAt: DateTime                                             │
│ updatedAt: DateTime                                             │
│ createdById: UUID (FK → User)                                   │
│ isLiving: Boolean (derived or explicit)                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Relationship                            │
├─────────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                                   │
│ personId: UUID (FK → Person)                                    │
│ relatedPersonId: UUID (FK → Person)                             │
│ type: Enum (Parent, Child, Spouse, Sibling)                     │
│ # For spouse relationships                                      │
│ marriageDate: Date?                                             │
│ divorceDate: Date?                                              │
│ isActive: Boolean (for current vs ex-spouse)                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                            User                                 │
├─────────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                                   │
│ email: String (unique)                                          │
│ passwordHash: String?                                           │
│ personId: UUID? (FK → Person, links user to their profile)      │
│ role: Enum (Admin, Member, Viewer)                              │
│ isActive: Boolean                                               │
│ invitedBy: UUID? (FK → User)                                    │
│ createdAt: DateTime                                             │
│ lastLoginAt: DateTime?                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      SuggestionRequest                          │
├─────────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                                   │
│ type: Enum (Create, Update, Delete, AddRelationship)            │
│ targetPersonId: UUID? (FK → Person, null for new person)        │
│ suggestedData: JSON (the proposed changes)                      │
│ reason: Text?                                                   │
│ status: Enum (Pending, Approved, Rejected)                      │
│ submittedById: UUID (FK → User)                                 │
│ reviewedById: UUID? (FK → User)                                 │
│ reviewNote: Text?                                               │
│ submittedAt: DateTime                                           │
│ reviewedAt: DateTime?                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       FamilySettings                             │
├─────────────────────────────────────────────────────────────────┤
│ id: UUID (PK) - singleton, only one record                      │
│ familyName: String (e.g., "The Patel Family")                   │
│ description: Text?                                              │
│ locale: String (default: "en")                                  │
│ customLabels: JSON? (terminology overrides)                     │
│ defaultPrivacy: Enum (Public, MembersOnly, AdminOnly)           │
│ allowSelfRegistration: Boolean (default: true)                  │
│ requireApprovalForEdits: Boolean (default: true)                │
│ createdAt: DateTime                                             │
│ updatedAt: DateTime                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        AuditLog                                  │
├─────────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                                   │
│ userId: UUID (FK → User)                                        │
│ action: Enum (Create, Update, Delete, Login, Approve, Reject)   │
│ entityType: String (Person, Relationship, User, etc.)           │
│ entityId: UUID?                                                 │
│ previousData: JSON?                                             │
│ newData: JSON?                                                  │
│ ipAddress: String?                                              │
│ userAgent: String?                                              │
│ createdAt: DateTime                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Relationship Model Strategy

Two options for modeling parent-child relationships:

Option A: Explicit Relationship Table (Recommended)

- Flexible for any relationship type
- Easy to query descendants/ancestors with recursive CTEs
- Handles complex cases (adoption, step-parents)

Option B: Direct Foreign Keys (simpler)

```text
Person {
  fatherId: UUID? (FK → Person)
  motherId: UUID? (FK → Person)
}
```

- Simpler queries for immediate parents
- Less flexible for non-traditional families
- Spouse still needs separate table

**Recommendation:** Option A - more flexible and future-proof.

---

## 4. Feature Roadmap

### Phase 1: Foundation (MVP) - Week 1-2

- [ ] Project setup (Next.js 14, Bun, TypeScript, Tailwind)
- [ ] Docker setup (both Postgres and SQLite variants)
- [ ] Prisma schema + migrations (all core entities)
- [ ] Zod schemas (shared validation)
- [ ] TanStack Query provider setup
- [ ] Pluggable storage adapter (local filesystem MVP)
- [ ] Auth setup (email/password + OIDC config structure)
- [ ] Admin seed script (env-based credentials)
- [ ] Person Server Actions (CRUD)
- [ ] Relationship Server Actions (CRUD)
- [ ] Basic person profile page (view/edit)
- [ ] Self-registration flow (claim existing profile)
- [ ] Minimal UI with shadcn/ui components

### Phase 2: Core Experience - Week 3-4

- [ ] Family tree visualization (interactive graph)
- [ ] Photo upload and management
- [ ] Search and filter people
- [ ] User roles (Admin, Member, Viewer)
- [ ] Invite system for new family members
- [ ] Responsive mobile design

### Phase 3: Collaboration - Week 5-6

- [ ] Suggestion/approval workflow
- [ ] Activity feed (recent changes)
- [ ] Notifications (email or in-app)
- [ ] Audit log (who changed what)
- [ ] Bulk import (GEDCOM format consideration)

### Phase 4: Polish & Deploy - Week 7-8

- [ ] Performance optimization
- [ ] Error handling and edge cases
- [ ] Production Docker Compose setup
- [ ] Backup strategy
- [ ] Documentation
- [ ] Optional: export to PDF/image

### Future Considerations (Post-MVP)

- Family timeline view
- Photo albums / galleries
- Stories / memories section
- DNA integration (if applicable)
- Multi-family support (multiple trees)
- API for mobile app

---

## 5. UI/UX Considerations

### Key Views

1. **Dashboard**
   - Quick stats (total members, recent updates)
   - Pending suggestions (for admins)
   - Quick search

2. **Family Tree View**
   - Interactive zoomable/pannable graph
   - Click node → sidebar with person summary
   - Visual indicators for living vs deceased
   - Color coding by generation or branch

3. **Person Profile**
   - Photo and basic info hero
   - Tabbed sections (Personal, Contact, Professional, Relationships)
   - Edit button (opens modal or inline editing)
   - "Suggest Edit" for non-admins

4. **People List**
   - Table/grid view with filters
   - Sort by name, age, branch
   - Quick actions (view, edit, add relationship)

5. **Admin Panel**
   - User management
   - Pending suggestions queue
   - Activity log
   - Settings (family name, privacy defaults)

### Design Principles

- **Respectful**: Sensitive handling of deceased members, privacy options
- **Accessible**: WCAG 2.1 AA compliance
- **Mobile-first**: Many family members will use phones
- **Intuitive**: Older family members should navigate easily
- **Fast**: Lazy loading, optimistic updates

---

## 6. Security & Privacy

### Access Levels

| Role   | Can View                       | Can Edit Own             | Can Suggest | Can Approve | Can Manage Users |
| ------ | ------------------------------ | ------------------------ | ----------- | ----------- | ---------------- |
| Viewer | All profiles (living limited?) | No                       | No          | No          | No               |
| Member | All profiles                   | Yes (own linked profile) | Yes         | No          | No               |
| Admin  | All profiles                   | Yes (any)                | Yes         | Yes         | Yes              |

### Privacy Considerations

- Option to hide contact info from non-admins
- Living persons have more restricted default visibility
- Deceased persons: full visibility (configurable)
- GDPR considerations: right to deletion, data export

---

## 7. Deployment Architecture

### Option A: PostgreSQL (Recommended for production)

```text
┌─────────────────────────────────────────────────────────────────┐
│              docker-compose.yml (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────┐                │
│  │    Next.js      │────────▶│   PostgreSQL    │                │
│  │    (webapp)     │         │      (db)       │                │
│  │    :3000        │         │     :5432       │                │
│  └────────┬────────┘         └─────────────────┘                │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │  /data/uploads  │  (Docker volume for photos)                │
│  └─────────────────┘                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Option B: SQLite (Simple single-container deploy)

```text
┌─────────────────────────────────────────────────────────────────┐
│            docker-compose.sqlite.yml (SQLite)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────┐                    │
│  │              Next.js                     │                    │
│  │              (webapp)                    │                    │
│  │              :3000                       │                    │
│  │                                          │                    │
│  │  ┌─────────────┐    ┌─────────────┐     │                    │
│  │  │ SQLite DB   │    │   Uploads   │     │                    │
│  │  │ /data/*.db  │    │ /data/uploads│    │                    │
│  │  └─────────────┘    └─────────────┘     │                    │
│  └─────────────────────────────────────────┘                    │
│                     │                                           │
│            Single Docker volume (/data)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Variables

```env
# ============================================
# DATABASE
# ============================================
# PostgreSQL (default)
DATABASE_URL=postgresql://vamsa:password@db:5432/vamsa
# SQLite alternative (uncomment to use)
# DATABASE_URL=file:./data/vamsa.db

# ============================================
# AUTHENTICATION
# ============================================
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=http://localhost:3000

# Initial Admin (required for first run)
ADMIN_EMAIL=admin@yourfamily.com
ADMIN_PASSWORD=  # Leave empty to auto-generate and print to logs

# OIDC (optional - bring your own provider)
OIDC_ENABLED=false
OIDC_PROVIDER_NAME="SSO"
OIDC_ISSUER=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=

# ============================================
# STORAGE
# ============================================
STORAGE_PROVIDER=local  # 'local' or 's3'
STORAGE_LOCAL_PATH=/data/uploads

# S3 Configuration (when STORAGE_PROVIDER=s3)
S3_ENDPOINT=
S3_BUCKET=photos
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_REGION=us-east-1

# ============================================
# APP CONFIGURATION
# ============================================
NEXT_PUBLIC_APP_NAME="Our Family Tree"
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================
# OPTIONAL
# ============================================
# LOG_LEVEL=info
# NODE_ENV=production
```

---

## 8. Confirmed Decisions

### 8.1 Database Strategy

- **Default**: PostgreSQL for production deployments
- **Alternative**: SQLite support for simple/single-user deployments
- **Implementation**: Prisma with switchable provider via `DATABASE_URL` env var
- **Schema**: Identical for both, avoid Postgres-specific features in core schema

### 8.2 Authentication Strategy

```uml
┌─────────────────────────────────────────────────────────────────┐
│                     Auth Architecture                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Email/Password  │  │   OIDC/OAuth    │  │  Magic Link     │  │
│  │   (built-in)    │  │ (bring your own)│  │   (future)      │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┴────────────────────┘           │
│                                │                                │
│                    ┌───────────▼───────────┐                    │
│                    │    NextAuth.js        │                    │
│                    │   (Auth.js v5)        │                    │
│                    └───────────┬───────────┘                    │
│                                │                                │
│                    ┌───────────▼───────────┐                    │
│                    │   Session + Roles     │                    │
│                    │  (Admin/Member/Viewer)│                    │
│                    └───────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**User Registration Flows:**

1. **Self-registration**: Family members already in tree can claim their profile
   - Enter email → system checks if email matches a Person record → link accounts
   - Or enter invite code from admin
2. **Admin-created**: Admin creates User account, user sets password on first login
3. **OIDC**: Users authenticate via external provider (Google, Okta, etc.)

**OIDC Configuration (env vars):**

```env
OIDC_ENABLED=true
OIDC_PROVIDER_NAME="Company SSO"
OIDC_ISSUER=https://auth.example.com
OIDC_CLIENT_ID=xxx
OIDC_CLIENT_SECRET=xxx
```

### 8.3 Photo Storage Strategy

```typescript
// Pluggable storage interface
interface StorageAdapter {
  upload(file: Buffer, filename: string): Promise<string>  // returns URL
  delete(url: string): Promise<void>
  getSignedUrl(url: string, expiresIn?: number): Promise<string>
}

// Implementations
class LocalStorageAdapter implements StorageAdapter { ... }  // MVP
class S3StorageAdapter implements StorageAdapter { ... }     // Future
```

**MVP**: Files stored in `/data/uploads` Docker volume, served via Next.js API route
**Future**: S3/MinIO with pre-signed URLs

**Configuration:**

```env
STORAGE_PROVIDER=local  # or 's3'
STORAGE_LOCAL_PATH=/data/uploads
# S3 config (when STORAGE_PROVIDER=s3)
S3_ENDPOINT=...
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

### 8.4 Cultural Customization

Default terminology with override capability for cultural/religious preferences:

```typescript
// Default labels (English)
const defaultLabels = {
  dateOfPassing: "Date of Passing",
  nativePlace: "Native Place",
  spouse: "Spouse",
  // ... etc
};

// Customizable via settings or i18n
// Example: Kutchi/Gujarati family might prefer
const kutchiLabels = {
  nativePlace: "Vadil Nu Gav", // ancestral village
  // ... etc
};
```

**Implementation**:

- Store custom labels in `FamilySettings` table
- Support full i18n later (Phase 4+)
- MVP: English with configurable key terms

### 8.5 Initial Admin Setup

**Seeding Strategy:**

```env
# Option A: Explicit credentials (recommended for production)
ADMIN_EMAIL=admin@family.com
ADMIN_PASSWORD=your-secure-password

# Option B: Auto-generate (dev/quick setup)
ADMIN_EMAIL=admin@family.com
# If ADMIN_PASSWORD not set, generate random and print to logs
```

**Seed script behavior:**

1. Check if any admin exists
2. If not, create admin with env credentials OR generate random password
3. Log credentials ONCE on first run (never again)
4. Force password change on first login (if auto-generated)

### 8.6 Tree Visualization

- **MVP**: Vertical tree (ancestors at top, descendants below)
- **Future options**: Horizontal, radial, pedigree chart
- **Library**: React Flow (interactive, zoomable, pannable)

### 8.7 Scope Confirmation

- 8-week roadmap approved
- Prioritize pluggability (DB, auth, storage) in Phase 1
- Cultural customization as Phase 2 enhancement

---

## 9. Project Structure (Proposed)

```text
vamsa/
├── docker-compose.yml          # Postgres variant
├── docker-compose.sqlite.yml   # SQLite variant (simple deploy)
├── Dockerfile
├── .env.example
├── package.json
├── bun.lockb
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                 # Admin seeding script
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── claim-profile/  # Self-registration flow
│   │   │   └── reset-password/
│   │   ├── (dashboard)/        # Protected routes
│   │   │   ├── tree/           # Family tree view
│   │   │   ├── people/         # People list & profiles
│   │   │   │   └── [id]/       # Individual profile
│   │   │   ├── suggestions/    # Suggestion queue
│   │   │   └── admin/          # Admin panel
│   │   │       ├── users/
│   │   │       └── settings/   # Cultural customization
│   │   ├── api/                # API routes (minimal)
│   │   │   ├── auth/           # NextAuth routes
│   │   │   └── upload/         # Photo upload (needs streaming)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx       # TanStack Query provider
│   ├── actions/                # Server Actions
│   │   ├── person.ts           # Person CRUD actions
│   │   ├── relationship.ts     # Relationship actions
│   │   ├── suggestion.ts       # Suggestion workflow actions
│   │   ├── user.ts             # User management actions
│   │   └── settings.ts         # Family settings actions
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── tree/               # Tree visualization
│   │   ├── person/             # Person-related components
│   │   ├── forms/              # Form components
│   │   └── layout/             # Layout components (nav, sidebar)
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── auth.ts             # NextAuth config
│   │   ├── auth-options.ts     # Auth providers setup
│   │   ├── query-client.ts     # TanStack Query client setup
│   │   ├── storage/            # Pluggable storage
│   │   │   ├── index.ts        # Storage factory
│   │   │   ├── types.ts        # StorageAdapter interface
│   │   │   ├── local.ts        # Local filesystem adapter
│   │   │   └── s3.ts           # S3 adapter (future)
│   │   ├── labels.ts           # Customizable terminology
│   │   └── utils.ts
│   ├── schemas/                # Zod schemas (shared validation)
│   │   ├── person.ts
│   │   ├── relationship.ts
│   │   ├── user.ts
│   │   └── suggestion.ts
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-person.ts       # Person queries with TanStack
│   │   ├── use-tree.ts         # Tree data queries
│   │   └── use-suggestions.ts  # Suggestion queries
│   ├── types/                  # TypeScript types
│   └── config/                 # App configuration
│       └── env.ts              # Typed env vars
├── public/
│   ├── placeholder-avatar.png
│   └── locales/                # i18n files (future)
├── scripts/
│   └── generate-password.ts    # Admin password generator
├── data/                       # Docker volume mount point
│   └── uploads/                # Photo storage (local mode)
└── README.md
```

---

## 10. Next Steps

All decisions confirmed. Implementation ready to begin.

### Phase 1 Implementation Order

```text
Week 1:
├── Day 1-2: Project Scaffolding
│   ├── Initialize Next.js 14 with Bun
│   ├── Configure TypeScript, ESLint, Prettier
│   ├── Set up Tailwind + shadcn/ui
│   ├── TanStack Query provider
│   ├── Create Dockerfile + docker-compose.yml (both variants)
│   └── Environment configuration (.env.example)
│
├── Day 3-4: Database + Auth
│   ├── Prisma schema (all entities)
│   ├── Zod schemas (validation)
│   ├── Seed script (admin user)
│   ├── NextAuth setup (email/password + OIDC placeholder)
│   ├── Auth pages (login, register, claim-profile)
│   └── Protected route middleware
│
└── Day 5-7: Core Features
    ├── Person Server Actions (create, read, update, delete)
    ├── Relationship Server Actions
    ├── TanStack Query hooks (search, optimistic updates)
    ├── Basic person list page
    ├── Person profile page (view/edit)
    └── Storage adapter (local filesystem)

Week 2:
├── Basic family tree visualization (React Flow)
├── Add/edit relationship UI
├── Photo upload functionality
├── User roles enforcement
└── Initial deployment test (Docker)
```

### Commands to Start

```bash
# When ready to begin implementation:
bun create next-app@latest . --typescript --tailwind --eslint --app --src-dir

# Core dependencies
bun add @prisma/client next-auth @auth/prisma-adapter
bun add @tanstack/react-query zod react-hook-form @hookform/resolvers
bun add @xyflow/react  # React Flow for tree visualization

# Dev dependencies
bun add -d prisma @types/node

# Initialize Prisma
bunx prisma init
```

---

## Appendix: Key Implementation Patterns

### A. Data Fetching Strategy

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Data Flow Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SERVER COMPONENTS (Initial Load / SSR)                         │
│  └── Direct Prisma queries, no client JS                        │
│      └── Tree page, Person profile, People list                 │
│                                                                 │
│  SERVER ACTIONS (Mutations)                                     │
│  └── 'use server' functions with Zod validation                 │
│      └── Create/Update/Delete person, relationships, etc.       │
│                                                                 │
│  TANSTACK QUERY (Client Interactivity)                          │
│  └── Caching, optimistic updates, background refetch            │
│      └── Search, filters, real-time-ish updates                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### B. Server Actions Pattern

```typescript
// src/schemas/person.ts
import { z } from "zod";

export const personCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.coerce.date().optional(),
  dateOfPassing: z.coerce.date().optional(),
  // ... etc
});

export type PersonCreateInput = z.infer<typeof personCreateSchema>;

// src/actions/person.ts
("use server");

import { revalidatePath } from "next/cache";
import { personCreateSchema, PersonCreateInput } from "@/schemas/person";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export async function createPerson(input: PersonCreateInput) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  const validated = personCreateSchema.parse(input);

  const person = await db.person.create({
    data: { ...validated, createdById: session.user.id },
  });

  revalidatePath("/people");
  revalidatePath("/tree");

  return { success: true, person };
}

export async function updatePerson(
  id: string,
  input: Partial<PersonCreateInput>
) {
  // ... similar pattern
}
```

### C. TanStack Query Hooks Pattern

```typescript
// src/hooks/use-person.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPerson, searchPeople } from "@/actions/person";
import { updatePerson } from "@/actions/person";

// For client-side data needs (search, filters)
export function usePersonSearch(query: string) {
  return useQuery({
    queryKey: ["people", "search", query],
    queryFn: () => searchPeople(query),
    enabled: query.length > 0,
  });
}

// For mutations with optimistic updates
export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updatePerson(id, data),
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["person", id] });
      const previous = queryClient.getQueryData(["person", id]);
      queryClient.setQueryData(["person", id], (old) => ({ ...old, ...data }));
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(["person", variables.id], context?.previous);
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["person", id] });
    },
  });
}
```

### D. Query Provider Setup

```typescript
// src/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

// src/app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### E. Storage Adapter Pattern

```typescript
// src/lib/storage/types.ts
export interface StorageAdapter {
  upload(file: Buffer, filename: string, contentType: string): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

// src/lib/storage/index.ts
export function getStorageAdapter(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER || "local";
  switch (provider) {
    case "s3":
      return new S3Adapter();
    default:
      return new LocalAdapter();
  }
}
```

### F. Auth Configuration Pattern

```typescript
// src/lib/auth-options.ts
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const providers = [
  CredentialsProvider({
    name: "Email",
    credentials: { email: {}, password: {} },
    authorize: async (credentials) => {
      /* verify */
    },
  }),
];

// Add OIDC if configured
if (process.env.OIDC_ENABLED === "true") {
  providers.push(/* OIDC provider config */);
}

export const authOptions: AuthOptions = { providers /* ... */ };
```

### G. Cultural Labels Pattern

```typescript
// src/lib/labels.ts
const defaultLabels = {
  dateOfPassing: "Date of Passing",
  nativePlace: "Native Place",
  spouse: "Spouse",
  father: "Father",
  mother: "Mother",
};

export async function getLabels(): Promise<typeof defaultLabels> {
  const settings = await db.familySettings.findFirst();
  return { ...defaultLabels, ...settings?.customLabels };
}
```

---

**Planning complete. Ready to implement when you give the go-ahead.**
