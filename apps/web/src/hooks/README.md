# Web App Hooks

Custom React hooks for the Vamsa web application.

## useTreeKeyboardNav

Provides keyboard navigation for tree visualizations following the WAI-ARIA TreeView pattern.

### Features

- Full keyboard navigation (Arrow keys, Home, End, Enter, Space)
- ARIA attributes for screen reader support
- Virtual focus management using `aria-activedescendant`
- Selection state management
- Respects tree hierarchy for navigation

### Basic Usage

```tsx
import { useTreeKeyboardNav } from "~/hooks";
import type { ChartNode, ChartEdge } from "~/server/charts";

function MyTreeChart({
  nodes,
  edges,
}: {
  nodes: ChartNode[];
  edges: ChartEdge[];
}) {
  const { focusedNodeId, selectedNodeId, containerProps, getNodeProps } =
    useTreeKeyboardNav({
      nodes,
      edges,
      onActivate: (nodeId) => {
        // Called when user presses Enter on a node
        navigate({ to: "/people/$personId", params: { personId: nodeId } });
      },
      onSelect: (nodeId) => {
        // Called when user presses Space on a node
        console.log("Selected node:", nodeId);
      },
    });

  return (
    <div {...containerProps} className="tree-container">
      {nodes.map((node) => {
        const nodeProps = getNodeProps(node.id);
        const isFocused = focusedNodeId === node.id;
        const isSelected = selectedNodeId === node.id;

        return (
          <div
            key={node.id}
            {...nodeProps}
            className={cn(
              "tree-node",
              isFocused && "tree-node-focus",
              isSelected && "tree-node-selected"
            )}
          >
            {node.firstName} {node.lastName}
          </div>
        );
      })}
    </div>
  );
}
```

### Keyboard Navigation

| Key         | Action                                         |
| ----------- | ---------------------------------------------- |
| Tab         | Enter/exit tree (focus first node)             |
| Arrow Up    | Navigate to previous visible node              |
| Arrow Down  | Navigate to next visible node                  |
| Arrow Left  | Navigate to parent node                        |
| Arrow Right | Navigate to first child node                   |
| Home        | Jump to first node in tree                     |
| End         | Jump to last visible node                      |
| Enter       | Activate node (triggers `onActivate` callback) |
| Space       | Select node (triggers `onSelect` callback)     |

### Styling

The hook provides CSS classes for focus and selection states:

```css
/* Focus indicator (defined in styles.css) */
.tree-node-focus {
  box-shadow:
    0 0 0 2px var(--color-ring),
    0 0 0 4px var(--color-background);
}

/* Selected state */
.tree-node-selected {
  background-color: color-mix(in oklch, var(--color-primary) 10%, transparent);
  border-color: var(--color-primary);
}

/* Both focused and selected */
.tree-node-focus.tree-node-selected {
  box-shadow:
    0 0 0 2px var(--color-primary),
    0 0 0 4px var(--color-background);
}
```

### Integration with Existing Charts

To add keyboard navigation to existing chart components (TreeChart, AncestorChart, etc.):

1. Import and initialize the hook
2. Spread `containerProps` onto the chart container
3. Apply focus/selection classes to nodes based on hook state
4. Ensure nodes have the correct ARIA attributes from `getNodeProps`

### Accessibility

The hook implements the WAI-ARIA TreeView pattern:

- Container has `role="tree"` and manages focus
- Nodes have `role="treeitem"` and `aria-selected` attributes
- Virtual focus uses `aria-activedescendant` pattern
- Keyboard navigation follows ARIA best practices
- Screen readers announce node selection and navigation

### API

#### Parameters

```typescript
interface UseTreeKeyboardNavProps {
  nodes: Array<ChartNode>; // Array of tree nodes
  edges: Array<ChartEdge>; // Array of edges defining relationships
  rootNodeId?: string; // Optional root node ID (defaults to first node)
  onSelect?: (nodeId: string) => void; // Called when Space is pressed
  onActivate?: (nodeId: string) => void; // Called when Enter is pressed
  enabled?: boolean; // Enable/disable keyboard nav (default: true)
}
```

#### Return Value

```typescript
interface UseTreeKeyboardNavReturn {
  focusedNodeId: string | null; // Currently focused node ID
  selectedNodeId: string | null; // Currently selected node ID
  handleKeyDown: (e: React.KeyboardEvent) => void; // Key handler (included in containerProps)
  setFocusedNode: (id: string) => void; // Manually set focus to a node
  containerProps: {
    // Props to spread on container
    role: "tree";
    tabIndex: number;
    "aria-activedescendant": string | undefined;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  getNodeProps: (nodeId: string) => {
    // Get props for a specific node
    role: "treeitem";
    id: string;
    "aria-selected": boolean;
  };
}
```

### Testing

The hook is fully unit tested with Bun's test framework. See `useTreeKeyboardNav.test.ts` for examples.

```bash
bun test ./src/hooks/useTreeKeyboardNav.test.ts
```

### Related

- [WAI-ARIA TreeView Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
- [Design System - Accessibility](./.claude/skills/design/SKILL.md)
