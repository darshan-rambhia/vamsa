# Design Tokens

Vamsa's design system values. These are defined in `apps/web/src/styles.css` - reference them, don't reinvent.

---

## Color Foundation (LOCKED)

Vamsa uses an **OKLch color system** with earth-tone warmth.

### Light Mode Palette

```css
--color-background: oklch(0.98 0.01 80); /* Warm cream */
--color-foreground: oklch(0.22 0.05 145); /* Deep forest text */
--color-card: oklch(0.95 0.02 80); /* Light parchment */
--color-primary: oklch(0.38 0.12 145); /* Forest green - main accent */
--color-secondary: oklch(0.52 0.1 145); /* Moss green - softer accent */
--color-muted: oklch(0.95 0.02 80); /* Warm gray backgrounds */
--color-muted-foreground: oklch(0.38 0.06 40); /* Muted text */
--color-destructive: oklch(0.5 0.18 25); /* Autumn red */
--color-border: oklch(0.85 0.02 60); /* Subtle warm border */
```

### Dark Mode Palette

```css
--color-background: oklch(0.15 0.03 145); /* Deep forest */
--color-foreground: oklch(0.94 0.02 145); /* Light cream text */
--color-card: oklch(0.18 0.03 145); /* Dark green-tinted card */
--color-primary: oklch(0.58 0.08 145); /* Lighter green */
--color-border: oklch(0.28 0.03 145); /* Subtle dark border */
```

### Color Rules

- Use CSS variables (e.g., `bg-primary`, `text-muted-foreground`) - never hardcode colors
- The green hue (145) anchors the palette - it represents growth, family trees, nature
- Destructive actions use warm autumn red, not harsh pure red
- Borders are warm-tinted, not cool gray

---

## Typography System (LOCKED)

Vamsa's typography creates the editorial feel.

### Font Stack

| Purpose           | Class          | Font           | Fallback  |
| ----------------- | -------------- | -------------- | --------- |
| Display/Headlines | `font-display` | Fraunces       | Georgia   |
| Body              | `font-body`    | Source Sans 3  | system-ui |
| Mono/Data         | `font-mono`    | JetBrains Mono | monospace |

### Heading Scale

```css
h1: clamp(2.5rem, 5vw, 4rem); /* Hero headlines - fluid */
h2: clamp(1.75rem, 3.5vw, 2.5rem);
h3: clamp(1.25rem, 2.5vw, 1.75rem);
```

### Typography Rules

- Headlines use `letter-spacing: -0.02em` for editorial tightness
- Headlines use `line-height: 1.2` for compact elegance
- Body text uses default line-height for readability
- Enable font features: `font-feature-settings: "kern" 1, "liga" 1`

### When to Use Each Font

| Content Type       | Font Class            |
| ------------------ | --------------------- |
| Page titles        | `font-display`        |
| Section headings   | `font-display`        |
| Person names       | `font-display`        |
| Body text          | (default/`font-body`) |
| Dates              | `font-mono`           |
| IDs and codes      | `font-mono`           |
| GEDCOM data        | `font-mono`           |
| Generation numbers | `font-mono`           |

### Example

```tsx
// Good - using semantic classes
<h1 className="font-display text-foreground">The Anderson Family</h1>
<p className="text-muted-foreground">Est. 1847 · 156 members</p>
<span className="font-mono text-sm">ID: P-2847</span>

// Bad - hardcoding styles
<h1 style={{ fontFamily: 'Fraunces' }}>...</h1>
```

---

## Spacing System (4px Grid)

| Size | Tailwind       | Pixels | Use Case                              |
| ---- | -------------- | ------ | ------------------------------------- |
| 1    | `gap-1`, `p-1` | 4px    | Micro spacing (icon gaps)             |
| 2    | `gap-2`, `p-2` | 8px    | Tight spacing (within components)     |
| 3    | `gap-3`, `p-3` | 12px   | Standard spacing (related elements)   |
| 4    | `gap-4`, `p-4` | 16px   | Comfortable spacing (section padding) |
| 6    | `gap-6`, `p-6` | 24px   | Generous spacing (between sections)   |
| 8    | `gap-8`, `p-8` | 32px   | Major separation                      |

---

## Border Radius System

| Size | Tailwind       | Value   | Use Case                 |
| ---- | -------------- | ------- | ------------------------ |
| sm   | `rounded-sm`   | 0.25rem | Inputs, small elements   |
| md   | `rounded-md`   | 0.5rem  | Buttons, badges          |
| lg   | `rounded-lg`   | 0.75rem | Cards, containers        |
| xl   | `rounded-xl`   | 1rem    | Modals, large containers |
| full | `rounded-full` | 9999px  | Avatars only             |

---

## Shadow System

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

**Shadow Rules:**

- Shadows enhance on hover, not at rest
- Dark mode relies more on borders, less on shadows
- No dramatic drop shadows ever

---

## Motion & Animation

### Timing

```css
--transition-fast: 200ms ease-out;
--transition-smooth: 300ms ease-out;
```

### Animation Classes

| Class                | Duration | Use Case                              |
| -------------------- | -------- | ------------------------------------- |
| `.transition-fast`   | 200ms    | Micro-interactions (buttons, toggles) |
| `.transition-smooth` | 300ms    | Larger transitions (cards, modals)    |
| `.hover-lift`        | 200ms    | Subtle 2px lift on hover              |
| `.animate-fade-in`   | 400ms    | Fade with 8px translateY              |
| `.stagger-children`  | varies   | Cascading entrance animations         |

### Motion Rules

**Never:**

- Spring/bouncy animations
- Durations over 400ms
- Jarring scale changes (max 0.98-1.02)

**Always:**

- Respect `prefers-reduced-motion`
- Use `ease-out` for natural feel
- Keep subtle and professional

---

## Dark Mode

Dark mode is green-tinted, not pure gray. The forest theme carries through.

### Key Differences

- Backgrounds shift to deep forest greens, not neutral grays
- Borders become more important (shadows less visible)
- Primary green lightens for better contrast
- Cards subtly lift from background via lighter green tint

### Testing

- Always test both modes before completing
- Use `class="dark"` on a parent element to test
- Check that all text has sufficient contrast
