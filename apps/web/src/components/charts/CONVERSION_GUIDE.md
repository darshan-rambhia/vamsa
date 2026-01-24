# Chart Components D3 to react-native-svg Conversion Guide

This guide documents the conversion from D3 DOM manipulation to react-native-svg for cross-platform compatibility.

## Current State

### Already Compatible (No Conversion Needed)

These components are pure React with JSX - they don't use D3 DOM manipulation:

- **ChartLegend.tsx** - Pure JSX with Tailwind styling
- **ChartSkeleton.tsx** - Pure JSX with Lucide icons
- **ChartTooltip.tsx** - Pure JSX with CSS positioning

### Needs Conversion

1. **d3-utils.ts** - D3-specific rendering functions:
   - `renderRectNode()` - DOM manipulation via `d3.select()`, `d3.append()`
   - `renderCircleNode()` - DOM manipulation via `d3.select()`, `d3.append()`
   - `renderParentChildEdge()` - DOM manipulation via `d3.select()`, `d3.append()`
   - `renderSpouseEdge()` - DOM manipulation via `d3.select()`, `d3.append()`
   - `setupSVGContainer()` - DOM manipulation via `d3.select()`

2. **Chart Components** - Use D3 selections and DOM manipulation:
   - TreeChart.tsx
   - AncestorChart.tsx
   - DescendantChart.tsx
   - HourglassChart.tsx
   - FanChart.tsx
   - BowtieChart.tsx
   - CompactTree.tsx
   - TimelineChart.tsx
   - RelationshipMatrix.tsx

### Keep Using D3

D3 is still used for **mathematical calculations** (these don't need conversion):

- D3 scales (`d3.scaleLinear`, `d3.scaleTime`, etc.)
- D3 path generators (`d3.arc`, `d3.line`, etc.)
- D3 layouts (for position calculations)
- D3 zoom behavior (may need alternative for React Native)

## Conversion Pattern

### Before (D3 DOM Manipulation)

```typescript
// d3-utils.ts
export function renderRectNode(
  nodeG: d3.Selection<SVGGElement, unknown, null, undefined>,
  node: ChartNode,
  position: { x: number; y: number },
  options: RectNodeOptions
): void {
  const rect = nodeG
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", fillColor)
    .on("mouseenter", handleMouseEnter);

  nodeG
    .append("text")
    .attr("x", width / 2)
    .text(node.firstName);
}
```

### After (react-native-svg)

```tsx
// ChartElements.tsx
export function RectNode({
  node,
  x,
  y,
  width,
  height,
  onMouseEnter,
}: RectNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <G onMouseEnter={() => setIsHovered(true)}>
      <Rect x={x} y={y} width={width} height={height} fill={fillColor} />
      <Text x={x + width / 2} textAnchor="middle">
        {node.firstName}
      </Text>
    </G>
  );
}
```

## Key Differences

### 1. Declarative JSX vs Imperative D3

**D3 (Imperative):**

```typescript
g.append("rect").attr("x", 10).attr("y", 20).attr("width", 100);
```

**react-native-svg (Declarative):**

```tsx
<Rect x={10} y={20} width={100} />
```

### 2. React State for Interactivity

**D3 (Event Handlers):**

```typescript
rect.on("mouseenter", function () {
  d3.select(this).transition().style("fill", "blue");
});
```

**React (useState):**

```tsx
const [isHovered, setIsHovered] = useState(false);
<Rect
  fill={isHovered ? "blue" : "gray"}
  onMouseEnter={() => setIsHovered(true)}
/>;
```

### 3. Prop Names

| D3 Attribute                | react-native-svg Prop |
| --------------------------- | --------------------- |
| `attr("stroke")`            | `stroke`              |
| `attr("fill")`              | `fill`                |
| `style("stroke-width")`     | `strokeWidth`         |
| `style("stroke-dasharray")` | `strokeDasharray`     |
| `attr("text-anchor")`       | `textAnchor`          |

### 4. CSS Variables

Both D3 and react-native-svg support CSS variables:

```tsx
<Rect fill="var(--color-primary)" stroke="var(--color-border)" />
```

## Implementation Files

### ✅ Completed

- **ChartElements.tsx** - React component versions of D3 rendering functions
  - `RectNode` - Replaces `renderRectNode()`
  - `CircleNode` - Replaces `renderCircleNode()`
  - `ParentChildEdge` - Replaces `renderParentChildEdge()`
  - `SpouseEdge` - Replaces `renderSpouseEdge()`

### 🔲 Pending

- Convert TreeChart.tsx to use ChartElements components
- Convert other chart components (Ancestor, Descendant, etc.)
- Update d3-utils.ts to export position calculation functions separately
- Handle zoom/pan behavior (may need alternative for React Native)

## Usage Example

### Before (D3 DOM Manipulation in TreeChart)

```typescript
const { svg, g } = setupSVGContainer(svgRef, width, height);

nodes.forEach((node) => {
  const nodeG = g.append("g").attr("transform", `translate(${x}, ${y})`);
  renderRectNode(nodeG, node, pos, { width, height });
});
```

### After (react-native-svg Components)

```tsx
<Svg width={width} height={height}>
  <G transform={`translate(${x}, ${y})`}>
    {nodes.map((node) => (
      <RectNode
        key={node.id}
        node={node}
        x={node.x - width / 2}
        y={node.y - height / 2}
        width={width}
        height={height}
      />
    ))}
  </G>
</Svg>
```

## Migration Strategy

1. **Phase 1: Create React Components** ✅
   - Created ChartElements.tsx with basic components
   - Demonstrated conversion pattern

2. **Phase 2: Convert One Chart (Proof of Concept)**
   - Convert TreeChart.tsx to use ChartElements
   - Verify functionality and performance
   - Document any issues or edge cases

3. **Phase 3: Convert Remaining Charts**
   - Use TreeChart as template
   - Convert each chart component one by one
   - Maintain D3 for calculations, replace only DOM manipulation

4. **Phase 4: Cleanup**
   - Remove or deprecate D3 DOM manipulation functions
   - Update tests
   - Document final patterns

## Testing Strategy

For each converted component:

1. **Visual Regression**: Compare rendered output with original
2. **Interaction**: Verify hover states, click handlers work
3. **Performance**: Measure render time for large datasets
4. **Accessibility**: Ensure keyboard navigation and screen readers work

## Next Steps

1. Convert TreeChart.tsx as proof of concept
2. Run dev server and verify visual appearance
3. Test interactions (hover, click, zoom)
4. Update this guide with any learnings
5. Proceed with other chart components

## Design System Compliance

All converted components must maintain Vamsa's design system:

- Use CSS variables for colors (never hardcode)
- Follow 4px spacing grid
- Use 2px borders for cards/nodes
- Maintain hover transition timing (200-300ms)
- Ensure WCAG 2.1 AA contrast compliance
- Support keyboard navigation

See `.claude/skills/design/SKILL.md` for complete design system.
