# PersonHoverCard Usage Guide

The `PersonHoverCard` component provides a hover card with rich person details that appears when hovering over tree nodes. It uses Radix UI's HoverCard primitive for accessibility and smooth interactions.

## Basic Usage

```tsx
import { PersonHoverCard } from "~/components/charts/PersonHoverCard";

function PersonNode({ person }) {
  return (
    <PersonHoverCard
      person={person}
      onViewDetails={(id) =>
        navigate({ to: "/people/$personId", params: { personId: id } })
      }
    >
      <button type="button">
        {person.firstName} {person.lastName}
      </button>
    </PersonHoverCard>
  );
}
```

## Integration with Tree Charts

The `PersonHoverCard` can be integrated with existing chart components by wrapping the node elements:

```tsx
import { RectNode } from "./ChartElements";
import { PersonHoverCard } from "./PersonHoverCard";

function TreeChart({ nodes }) {
  return (
    <Svg>
      <G>
        {nodes.map((node) => {
          const position = nodePositions.get(node.id);
          if (!position) return null;

          return (
            <PersonHoverCard
              key={node.id}
              person={node}
              onViewDetails={handleViewDetails}
            >
              <G>
                <RectNode
                  node={node}
                  x={position.x}
                  y={position.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                />
              </G>
            </PersonHoverCard>
          );
        })}
      </G>
    </Svg>
  );
}
```

## Props

### `person` (required)

Object containing person details:

```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  dateOfPassing: string | null;
  isLiving: boolean;
  photoUrl: string | null;
  gender: string | null;
}
```

### `children` (required)

The trigger element that will activate the hover card. Can be any React node.

### `onViewDetails` (optional)

Callback function called when the "View Details" button is clicked:

```typescript
onViewDetails?: (id: string) => void
```

### `openDelay` (optional)

Delay in milliseconds before showing the hover card. Default: `300`

### `closeDelay` (optional)

Delay in milliseconds before hiding the hover card. Default: `200`

## Examples

### With Custom Delays

```tsx
<PersonHoverCard
  person={person}
  openDelay={500} // Wait 500ms before showing
  closeDelay={100} // Hide after 100ms
>
  <TreeNode />
</PersonHoverCard>
```

### Without View Details Button

```tsx
<PersonHoverCard person={person}>
  <TreeNode />
</PersonHoverCard>
```

### With Navigation

```tsx
import { useNavigate } from "@tanstack/react-router";

function TreeNode({ person }) {
  const navigate = useNavigate();

  return (
    <PersonHoverCard
      person={person}
      onViewDetails={(id) => {
        navigate({ to: "/people/$personId", params: { personId: id } });
      }}
    >
      <button type="button">{person.firstName}</button>
    </PersonHoverCard>
  );
}
```

## Accessibility

The component follows WCAG 2.1 AA guidelines:

- Keyboard accessible: Shows on focus
- Screen reader compatible: Content is announced properly
- ARIA attributes: Proper labeling and roles
- Escape key: Dismisses the hover card

## Design Tokens

The hover card uses Vamsa's design system:

- **Avatar**: 48px circular with 2px border
- **Name**: `font-display` with `font-medium`
- **Dates**: `text-sm` with `text-muted-foreground`
- **Living Badge**: `bg-chart-1/10` with `text-chart-1`
- **Button**: `variant="outline"` with `size="sm"`

## Notes

- The hover card automatically positions itself to avoid viewport overflow
- Delays are configurable to balance responsiveness and accidental triggers
- Works seamlessly with pan/zoom interactions in chart components
- On touch devices, use long-press to activate (handled by Radix UI)
