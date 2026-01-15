---
name: vamsa-design
description: Enforce Vamsa's design system - professional, minimalistic, and organic. Use this skill when building family tree interfaces, person profiles, relationship visualizations, or any UI in the Vamsa app. Clean, restrained, and alive.
---

# Vamsa Design System

This skill enforces Vamsa's design philosophy for genealogy software. The aesthetic is **professional + minimalistic + organic** - enterprise-quality craft meets natural warmth. Every interface should feel clean yet alive.

## Design Direction (COMMITTED)

Vamsa has a defined aesthetic. Don't deviate.

### The Vamsa Philosophy: Professional + Minimalistic + Organic

**Professional** - Clean, trustworthy, well-crafted interfaces that feel enterprise-ready. No amateur hour. Pixel-perfect attention to detail. Consistent patterns. Proper hierarchy.

**Minimalistic** - Restrained and essential. Only what's needed, nothing decorative. If an element doesn't serve a clear purpose, remove it. Negative space is intentional. Reduce visual noise aggressively.

**Organic** - Earth tones that feel warm, not sterile. Forest greens, warm creams, natural materials palette. Interfaces that feel alive and human, not cold and clinical. The opposite of typical gray tech aesthetics.

The three pillars work together: professional quality + minimal restraint + organic warmth. This is NOT a typical SaaS dashboard with generic grays. It's closer to a beautifully designed object - functional but with soul.

### Accessibility (NON-NEGOTIABLE)

**Vamsa must be accessible to all users.** This is not optional - it's a core quality requirement.

**WCAG 2.1 AA Compliance:**
- All text must meet minimum contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Interactive elements need 3:1 contrast against backgrounds
- Don't rely on color alone to convey information (add icons, text, or patterns)

**Keyboard Navigation:**
- All interactive elements must be keyboard accessible
- Logical tab order that follows visual layout
- Visible focus indicators on all focusable elements
- No keyboard traps - users can always tab away

**Focus States:**
```css
/* Vamsa's focus style - always visible, never removed */
:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--color-ring),
    0 0 0 4px var(--color-background);
}
```
Never use `outline: none` without providing an alternative focus indicator.

**Semantic HTML:**
- Use correct heading hierarchy (h1 → h2 → h3, no skipping)
- Use `<button>` for actions, `<a>` for navigation
- Use `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` landmarks
- Lists use `<ul>`/`<ol>`, not divs with bullet points
- Tables use `<table>` with proper `<th>` headers

**Screen Reader Support:**
- Images need meaningful `alt` text (or `alt=""` if decorative)
- Icons need `aria-label` or accompanying text
- Dynamic content updates use `aria-live` regions
- Form inputs have associated `<label>` elements
- Error messages are announced and linked to inputs

**ARIA When Needed:**
```tsx
// Good - semantic HTML first
<button onClick={onClose}>Close</button>

// When semantics aren't enough, add ARIA
<div role="dialog" aria-labelledby="dialog-title" aria-modal="true">
  <h2 id="dialog-title">Edit Person</h2>
</div>

// Icon-only buttons need labels
<Button variant="ghost" size="icon" aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>
```

**Motion & Vestibular:**
- Respect `prefers-reduced-motion` for users sensitive to animation
- No auto-playing animations that can't be paused
- Avoid parallax and excessive motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Testing Checklist:**
- [ ] Can navigate entire UI with keyboard only
- [ ] Focus indicator visible on all interactive elements
- [ ] Screen reader announces content logically
- [ ] Color contrast passes (use browser DevTools or axe)
- [ ] No `aria-hidden` on focusable elements
- [ ] Form errors are associated with inputs

### Color Foundation (LOCKED)

Vamsa uses an **OKLch color system** with earth-tone warmth. These values are defined in `apps/web/src/styles.css` - reference them, don't reinvent.

**Light Mode Palette:**
```css
--color-background: oklch(0.98 0.01 80);     /* Warm cream */
--color-foreground: oklch(0.22 0.05 145);    /* Deep forest text */
--color-card: oklch(0.95 0.02 80);           /* Light parchment */
--color-primary: oklch(0.38 0.12 145);       /* Forest green - main accent */
--color-secondary: oklch(0.52 0.1 145);      /* Moss green - softer accent */
--color-muted: oklch(0.95 0.02 80);          /* Warm gray backgrounds */
--color-muted-foreground: oklch(0.38 0.06 40); /* Muted text */
--color-destructive: oklch(0.5 0.18 25);     /* Autumn red */
--color-border: oklch(0.85 0.02 60);         /* Subtle warm border */
```

**Dark Mode Palette:**
```css
--color-background: oklch(0.15 0.03 145);    /* Deep forest */
--color-foreground: oklch(0.94 0.02 145);    /* Light cream text */
--color-card: oklch(0.18 0.03 145);          /* Dark green-tinted card */
--color-primary: oklch(0.58 0.08 145);       /* Lighter green */
--color-border: oklch(0.28 0.03 145);        /* Subtle dark border */
```

**Color Rules:**
- Use CSS variables (e.g., `bg-primary`, `text-muted-foreground`) - never hardcode colors
- The green hue (145) anchors the palette - it represents growth, family trees, nature
- Destructive actions use warm autumn red, not harsh pure red
- Borders are warm-tinted, not cool gray

### Typography System (LOCKED)

Vamsa's typography creates the editorial feel. Use exactly these:

**Font Stack:**
- **Display/Headlines**: `font-display` → Fraunces (Georgia fallback) - literary serif
- **Body**: `font-body` → Source Sans 3 (system-ui fallback) - readable humanist sans
- **Mono/Data**: `font-mono` → JetBrains Mono - for IDs, dates, technical data

**Heading Scale:**
```css
h1: clamp(2.5rem, 5vw, 4rem);   /* Hero headlines - fluid */
h2: clamp(1.75rem, 3.5vw, 2.5rem);
h3: clamp(1.25rem, 2.5vw, 1.75rem);
```

**Typography Rules:**
- Headlines use `letter-spacing: -0.02em` for editorial tightness
- Headlines use `line-height: 1.2` for compact elegance
- Body text uses default line-height for readability
- Enable font features: `font-feature-settings: "kern" 1, "liga" 1`
- Monospace for: dates, IDs, GEDCOM codes, generation numbers

**Example Implementation:**
```tsx
// Good - using semantic classes
<h1 className="font-display text-foreground">The Anderson Family</h1>
<p className="text-muted-foreground">Est. 1847 · 156 members</p>
<span className="font-mono text-sm">ID: P-2847</span>

// Bad - hardcoding styles
<h1 style={{ fontFamily: 'Fraunces' }}>...</h1>
```

---

## Core Craft Principles

These are non-negotiable quality standards.

### The 4px Grid

All spacing uses a 4px base:
- `4px` (1) - micro spacing (icon gaps)
- `8px` (2) - tight spacing (within components)
- `12px` (3) - standard spacing (between related elements)
- `16px` (4) - comfortable spacing (section padding)
- `24px` (6) - generous spacing (between sections)
- `32px` (8) - major separation

Use Tailwind spacing: `gap-2`, `p-4`, `space-y-6`, `my-8`

### Symmetrical Padding

TLBR must match. Cards, buttons, containers - keep it balanced.

```tsx
// Good
<Card className="p-4">...</Card>
<Button className="px-4 py-2">...</Button>

// Bad - asymmetric without reason
<div className="pt-6 pb-2 px-4">...</div>
```

### Border Radius System

Vamsa uses a soft-but-not-rounded approach:
- `rounded-sm` (0.25rem) - inputs, small elements
- `rounded-md` (0.5rem) - buttons, badges
- `rounded-lg` (0.75rem) - cards, containers
- `rounded-xl` (1rem) - modals, large containers

Don't use `rounded-full` except for avatars and circular indicators.

### Depth Strategy: Borders + Subtle Shadows

Vamsa uses **warm borders as primary definition** with subtle shadow enhancement:

```tsx
// Card pattern - border-first with hover enhancement
<Card className="border-2 border-border hover:shadow-lg hover:border-primary/20 transition-smooth">
  ...
</Card>

// The standard shadow progression
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

**Depth Rules:**
- Cards use 2px borders (thicker than typical - editorial choice)
- Shadows enhance on hover, not at rest
- Dark mode relies more on borders, less on shadows
- No dramatic drop shadows ever

### Motion & Animation

Subtle, respectful motion - nothing bouncy or playful:

```css
--transition-fast: 200ms ease-out;
--transition-smooth: 300ms ease-out;
```

**Animation Classes:**
- `.transition-fast` - micro-interactions (buttons, toggles)
- `.transition-smooth` - larger transitions (cards, modals)
- `.hover-lift` - subtle 2px lift on hover
- `.animate-fade-in` - 0.4s fade with 8px translateY
- `.stagger-children` - cascading entrance animations

**Never:**
- Spring/bouncy animations
- Durations over 400ms
- Jarring scale changes (max 0.98-1.02)

---

## Genealogy-Specific Patterns

Vamsa has domain-specific UI needs. Follow these patterns.

### Person Cards

Person cards are the atomic unit of Vamsa. They must feel substantial but not heavy.

```tsx
// Person card pattern
<Card className="p-4 hover:shadow-lg hover:border-primary/20 transition-smooth">
  <div className="flex items-start gap-4">
    <Avatar className="h-12 w-12">
      <AvatarImage src={person.photoUrl} />
      <AvatarFallback className="bg-muted text-muted-foreground">
        {getInitials(person.name)}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <h3 className="font-display font-medium truncate">{person.name}</h3>
      <p className="text-sm text-muted-foreground">
        {formatLifespan(person.birthDate, person.deathDate)}
      </p>
    </div>
  </div>
</Card>
```

**Person Card Rules:**
- Avatar always present (initials fallback)
- Name in `font-display` for editorial feel
- Lifespan dates in muted text
- Deceased persons: add subtle muted background or "Deceased" badge
- Current user: highlight with primary border + "You" badge

### Family Tree Nodes (React Flow)

Tree nodes have specific color coding:

```tsx
// Node colors by status
const nodeColors = {
  living: {
    border: '#4A7C4E',      // Moss green
    background: '#f0fdf4',  // Light green tint
  },
  deceased: {
    border: '#9CA3AF',      // Gray
    background: '#f9fafb',  // Light gray
  },
  currentUser: {
    border: 'var(--color-primary)',
    ring: true,             // Add ring effect
  },
};

// Connection colors
const edgeColors = {
  spouse: '#4A7C4E',        // Green - solid or dotted if divorced
  parentChild: '#9CA3AF',   // Gray with arrow
  hidden: '#FFA500',        // Amber indicator
};
```

### Relationship Visualization

Relationships need visual hierarchy:

```tsx
// Relationship type badges
<Badge variant="outline" className="text-xs">
  {relationship.type} {/* Parent, Child, Spouse, Sibling */}
</Badge>

// Divorced status - visual differentiation
<div className="border-dashed border-muted-foreground/50">
  {/* Divorced spouse connection */}
</div>
```

### Data Display Patterns

Genealogy is data-heavy. Use these patterns:

```tsx
// Detail row pattern (for person profiles)
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value || '—'}</dd>
    </div>
  );
}

// Usage
<dl className="space-y-0">
  <DetailRow label="Birth Date" value={<span className="font-mono">{birthDate}</span>} />
  <DetailRow label="Birth Place" value={birthPlace} />
  <DetailRow label="Occupation" value={occupation} />
</dl>
```

**Data Rules:**
- Dates always in `font-mono`
- Missing data shows em-dash (—), not "N/A" or empty
- IDs and codes in `font-mono`
- Numbers use `tabular-nums` for alignment

### Timeline & Event Display

Family events need chronological clarity:

```tsx
// Timeline event pattern
<div className="relative pl-8 pb-6 border-l-2 border-primary/30 last:pb-0">
  <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-primary" />
  <time className="text-sm font-mono text-muted-foreground">{date}</time>
  <h4 className="font-medium mt-1">{event.title}</h4>
  <p className="text-muted-foreground">{event.description}</p>
</div>
```

---

## Component Patterns (shadcn/ui)

All components extend shadcn/ui primitives. Follow these patterns.

### Button Variants

```tsx
import { Button } from "@/components/ui/button";

// Primary action - forest green
<Button>Add Family Member</Button>

// Secondary - softer green
<Button variant="secondary">Edit</Button>

// Outline - transparent with green border
<Button variant="outline">Cancel</Button>

// Destructive - autumn red
<Button variant="destructive">Remove</Button>

// Ghost - minimal
<Button variant="ghost" size="icon"><X /></Button>
```

### Form Patterns

Forms use react-hook-form + Zod:

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personSchema, type PersonInput } from "@vamsa/schemas";

export function PersonForm() {
  const form = useForm<PersonInput>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      // ...
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter first name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields... */}
      </form>
    </Form>
  );
}
```

### Card Variations

Cards are the main container. Vary internal layout, not surface treatment:

```tsx
// Metric card
<Card className="p-4">
  <div className="text-sm text-muted-foreground">Total Members</div>
  <div className="text-3xl font-display font-medium mt-1">156</div>
</Card>

// Action card
<Card className="p-4 hover:shadow-lg hover:border-primary/20 transition-smooth cursor-pointer">
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-md bg-primary/10">
      <UserPlus className="h-5 w-5 text-primary" />
    </div>
    <div>
      <h3 className="font-medium">Add Family Member</h3>
      <p className="text-sm text-muted-foreground">Expand your tree</p>
    </div>
  </div>
</Card>

// Content card
<Card>
  <CardHeader>
    <CardTitle className="font-display">Recent Activity</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content */}
  </CardContent>
</Card>
```

---

## Layout Patterns

### Page Structure

```tsx
// Standard page layout
<div className="container-editorial section-padding">
  <header className="mb-8">
    <h1 className="font-display">{pageTitle}</h1>
    <p className="text-muted-foreground mt-2">{pageDescription}</p>
  </header>

  <main className="space-y-8">
    {/* Page content */}
  </main>
</div>
```

### Grid Layouts

```tsx
// Card grid - responsive
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card key={item.id}>...</Card>)}
</div>

// Detail layout - sidebar + content
<div className="grid gap-8 lg:grid-cols-[300px_1fr]">
  <aside>{/* Navigation or filters */}</aside>
  <main>{/* Main content */}</main>
</div>
```

### Navigation Context

Every page needs grounding:

```tsx
// Breadcrumbs
<nav className="text-sm text-muted-foreground mb-6">
  <Link href="/tree" className="hover:text-foreground">Family Tree</Link>
  <span className="mx-2">/</span>
  <span className="text-foreground">{person.name}</span>
</nav>
```

---

## Dark Mode

Dark mode is green-tinted, not pure gray. The forest theme carries through:

**Key differences:**
- Backgrounds shift to deep forest greens, not neutral grays
- Borders become more important (shadows less visible)
- Primary green lightens for better contrast
- Cards subtly lift from background via lighter green tint

**Testing:**
- Always test both modes before completing
- Use `class="dark"` on a parent element to test
- Check that all text has sufficient contrast

---

## Anti-Patterns

### Never Do This
- Hardcode colors instead of CSS variables
- Use `rounded-full` on cards or containers
- Apply pure gray backgrounds (always warm-tint)
- Skip the `font-display` for headlines
- Use bouncy/spring animations
- Add decorative gradients
- Mix sharp and rounded border radii in one component
- Use thin (1px) borders on cards - Vamsa uses 2px
- Remove focus outlines without providing alternatives
- Use `div` or `span` for clickable elements (use `button` or `a`)
- Skip heading levels (h1 → h3)
- Create icon-only buttons without `aria-label`
- Rely on color alone to convey meaning

### Always Ask
- "Is this professional enough for enterprise use?"
- "Can I remove anything without losing function?" (minimalistic)
- "Does this feel warm and organic, not cold and clinical?"
- "Is every element on the 4px grid?"
- "Am I using CSS variables for colors?"
- "Does this work in both light and dark mode?"
- "Can a keyboard-only user navigate this?"
- "Will a screen reader announce this correctly?"
- "Does this have sufficient color contrast?"

---

## Reference Files

When implementing, reference these files:
- `apps/web/src/styles.css` - Complete design system tokens
- `apps/web/tailwind.config.ts` - Tailwind configuration
- `packages/ui/src/primitives/` - shadcn/ui component library
- `apps/web/src/components/person/` - Person-related components
- `apps/web/src/components/tree/` - Tree visualization components

---

## The Vamsa Standard

Every interface should embody the three pillars:

1. **Professional** - Is this polished enough for enterprise use? Are the details crisp?
2. **Minimalistic** - Can I remove anything without losing function? Is there visual noise?
3. **Organic** - Does this feel warm and alive, or cold and clinical?

When in doubt: Does this feel like a beautifully designed object - clean, restrained, but unmistakably human? That's the bar.
