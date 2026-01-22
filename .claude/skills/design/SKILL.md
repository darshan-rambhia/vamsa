---
name: design
description: Enforce Vamsa's design system - professional, minimalistic, and organic. Use this skill when building UI in the Vamsa app. See tokens.md for design values and patterns.md for component patterns.
license: MIT
---

# Vamsa Design System

This skill enforces Vamsa's design philosophy for genealogy software. The aesthetic is **professional + minimalistic + organic** - enterprise-quality craft meets natural warmth.

**Reference files:**

- [tokens.md](./tokens.md) - Colors, typography, spacing, motion values
- [patterns.md](./patterns.md) - Component patterns, genealogy UI, layouts

---

## Design Philosophy (COMMITTED)

Vamsa has a defined aesthetic. Don't deviate.

### The Three Pillars

**Professional** - Clean, trustworthy, well-crafted interfaces that feel enterprise-ready. No amateur hour. Pixel-perfect attention to detail. Consistent patterns. Proper hierarchy.

**Minimalistic** - Restrained and essential. Only what's needed, nothing decorative. If an element doesn't serve a clear purpose, remove it. Negative space is intentional. Reduce visual noise aggressively.

**Organic** - Earth tones that feel warm, not sterile. Forest greens, warm creams, natural materials palette. Interfaces that feel alive and human, not cold and clinical. The opposite of typical gray tech aesthetics.

The three pillars work together: professional quality + minimal restraint + organic warmth. This is NOT a typical SaaS dashboard with generic grays. It's closer to a beautifully designed object - functional but with soul.

---

## Accessibility (NON-NEGOTIABLE)

**Vamsa must be accessible to all users.** This is not optional - it's a core quality requirement.

### WCAG 2.1 AA Compliance

- All text must meet minimum contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Interactive elements need 3:1 contrast against backgrounds
- Don't rely on color alone to convey information (add icons, text, or patterns)

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Logical tab order that follows visual layout
- Visible focus indicators on all focusable elements
- No keyboard traps - users can always tab away

### Focus States

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

### Semantic HTML

- Use correct heading hierarchy (h1 → h2 → h3, no skipping)
- Use `<button>` for actions, `<a>` for navigation
- Use `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` landmarks
- Lists use `<ul>`/`<ol>`, not divs with bullet points
- Tables use `<table>` with proper `<th>` headers

### Screen Reader Support

- Images need meaningful `alt` text (or `alt=""` if decorative)
- Icons need `aria-label` or accompanying text
- Dynamic content updates use `aria-live` regions
- Form inputs have associated `<label>` elements
- Error messages are announced and linked to inputs

### ARIA When Needed

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

### Motion & Vestibular

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
<Card className="border-border hover:border-primary/20 transition-smooth border-2 hover:shadow-lg">
  ...
</Card>
```

**Depth Rules:**

- Cards use 2px borders (thicker than typical - editorial choice)
- Shadows enhance on hover, not at rest
- Dark mode relies more on borders, less on shadows
- No dramatic drop shadows ever

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

## Accessibility Checklist

Before completing any UI work:

- [ ] Can navigate entire UI with keyboard only
- [ ] Focus indicator visible on all interactive elements
- [ ] Screen reader announces content logically
- [ ] Color contrast passes (use browser DevTools or axe)
- [ ] No `aria-hidden` on focusable elements
- [ ] Form errors are associated with inputs

---

## The Vamsa Standard

Every interface should embody the three pillars:

1. **Professional** - Is this polished enough for enterprise use? Are the details crisp?
2. **Minimalistic** - Can I remove anything without losing function? Is there visual noise?
3. **Organic** - Does this feel warm and alive, or cold and clinical?

When in doubt: Does this feel like a beautifully designed object - clean, restrained, but unmistakably human? That's the bar.

---

## Reference Files

When implementing, reference these files:

- `apps/web/src/styles.css` - Complete design system tokens
- `apps/web/tailwind.config.ts` - Tailwind configuration
- `packages/ui/src/primitives/` - shadcn/ui component library
- `apps/web/src/components/person/` - Person-related components
- `apps/web/src/components/tree/` - Tree visualization components
