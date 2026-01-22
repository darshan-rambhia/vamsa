# Component Patterns

Vamsa UI patterns for genealogy interfaces. All components extend shadcn/ui primitives.

---

## Genealogy-Specific Patterns

### Person Cards

Person cards are the atomic unit of Vamsa. They must feel substantial but not heavy.

```tsx
// Person card pattern
<Card className="hover:border-primary/20 transition-smooth p-4 hover:shadow-lg">
  <div className="flex items-start gap-4">
    <Avatar className="h-12 w-12">
      <AvatarImage src={person.photoUrl} />
      <AvatarFallback className="bg-muted text-muted-foreground">
        {getInitials(person.name)}
      </AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <h3 className="font-display truncate font-medium">{person.name}</h3>
      <p className="text-muted-foreground text-sm">
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
    border: "#4A7C4E", // Moss green
    background: "#f0fdf4", // Light green tint
  },
  deceased: {
    border: "#9CA3AF", // Gray
    background: "#f9fafb", // Light gray
  },
  currentUser: {
    border: "var(--color-primary)",
    ring: true, // Add ring effect
  },
};

// Connection colors
const edgeColors = {
  spouse: "#4A7C4E", // Green - solid or dotted if divorced
  parentChild: "#9CA3AF", // Gray with arrow
  hidden: "#FFA500", // Amber indicator
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
function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-border flex justify-between border-b py-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

// Usage
<dl className="space-y-0">
  <DetailRow
    label="Birth Date"
    value={<span className="font-mono">{birthDate}</span>}
  />
  <DetailRow label="Birth Place" value={birthPlace} />
  <DetailRow label="Occupation" value={occupation} />
</dl>;
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
<div className="border-primary/30 relative border-l-2 pb-6 pl-8 last:pb-0">
  <div className="bg-primary absolute top-0 left-[-5px] h-2.5 w-2.5 rounded-full" />
  <time className="text-muted-foreground font-mono text-sm">{date}</time>
  <h4 className="mt-1 font-medium">{event.title}</h4>
  <p className="text-muted-foreground">{event.description}</p>
</div>
```

---

## Component Patterns (shadcn/ui)

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

  <main className="space-y-8">{/* Page content */}</main>
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
<nav className="text-muted-foreground mb-6 text-sm">
  <Link href="/tree" className="hover:text-foreground">
    Family Tree
  </Link>
  <span className="mx-2">/</span>
  <span className="text-foreground">{person.name}</span>
</nav>
```

---

## Empty States

```tsx
// Empty state pattern
<div className="py-12 text-center">
  <div className="text-muted-foreground/50 mb-4">
    <Users className="mx-auto h-12 w-12" />
  </div>
  <h3 className="font-display mb-2 text-lg">No Family Members</h3>
  <p className="text-muted-foreground mb-6">
    Start building your family tree by adding the first member.
  </p>
  <Button>
    <Plus className="mr-2 h-4 w-4" />
    Add First Member
  </Button>
</div>
```

---

## Loading States

```tsx
// Skeleton pattern
<div className="animate-pulse space-y-4">
  <div className="bg-muted h-8 w-48 rounded" />
  <div className="bg-muted h-4 w-32 rounded" />
</div>

// Spinner (use sparingly)
<div className="flex items-center justify-center py-8">
  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
</div>
```

---

## Error States

```tsx
// Error message
<div className="border-destructive/20 bg-destructive/5 rounded-lg border p-4">
  <div className="flex items-start gap-3">
    <AlertCircle className="text-destructive mt-0.5 h-5 w-5" />
    <div>
      <h4 className="text-destructive font-medium">Error Loading Data</h4>
      <p className="text-muted-foreground mt-1 text-sm">{error.message}</p>
    </div>
  </div>
</div>
```

---

## Responsive Patterns

### Mobile Navigation

```tsx
// Responsive nav pattern
<nav className="hidden md:flex items-center gap-6">
  {/* Desktop nav */}
</nav>

<Sheet>
  <SheetTrigger asChild className="md:hidden">
    <Button variant="ghost" size="icon">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent>
    {/* Mobile nav */}
  </SheetContent>
</Sheet>
```

### Responsive Cards

```tsx
// Stack on mobile, grid on larger screens
<div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <Card key={item.id}>...</Card>
  ))}
</div>
```

### Touch Targets

- Minimum 44x44px for touch targets on mobile
- Use `p-3` or larger padding on interactive elements
- Add `touch-manipulation` for better mobile response
