# Chart Performance Optimizations

## Overview

This document summarizes the performance optimizations implemented for the family tree chart components to handle large datasets (1000+ people) efficiently.

## Dependencies Added

- **@tanstack/pacer**: Library for debouncing and animation scheduling (v0.17.2)
- **lucide-react**: Icon library for loading indicators

## Key Optimizations Implemented

### 1. React.memo for Chart Components

All chart components are now wrapped with `React.memo` to prevent unnecessary re-renders:

- `AncestorChart`
- `DescendantChart`
- `HourglassChart`
- `FanChart`
- `BowtieChart`

**Benefit**: Components only re-render when their props actually change, reducing CPU cycles.

### 2. Memoized Layout Parameters

Layout parameters (node dimensions, spacing, margins) are now memoized using `useMemo`:

```typescript
const layoutParams = useMemo(
  () => ({
    nodeWidth: 180,
    nodeHeight: 60,
    levelHeight: 120,
    margin: { top: 40, right: 40, bottom: 40, left: 40 },
  }),
  []
);
```

**Benefit**: Prevents recalculation of static values on every render.

### 3. Debounced Zoom/Pan Interactions

Zoom and pan handlers are debounced to 16ms (60fps) using a custom `useDebouncedZoom` hook:

```typescript
const debouncedZoomHandler = useDebouncedZoom(() => {
  // Handle zoom events
}, 16);
```

**Benefit**: Smooth 60fps interactions without excessive re-renders during zoom/pan operations.

### 4. Async Rendering with Loading States

Charts now render asynchronously using `setTimeout` to allow the loading skeleton to appear first:

```typescript
const timeoutId = setTimeout(() => {
  // Render chart
  setIsRendering(false);
}, 0);
```

**Benefit**: Provides immediate feedback to users with large datasets, preventing UI freezing.

### 5. Loading Skeleton Component

A new `ChartSkeleton` component displays loading messages for large datasets:

- Shows for datasets with 500+ people
- Displays estimated render time
- Provides visual feedback during rendering

**Thresholds**:
- 500-2000 people: "Loading family tree..." (~2-5s)
- 2000+ people: "Rendering large family tree..." (~5-10s)

### 6. Performance Monitoring

Built-in performance monitoring logs render times in development mode:

```typescript
if (process.env.NODE_ENV === "development") {
  console.log(`[Performance] AncestorChart rendered ${nodes.length} nodes in ${renderTime}ms`);
}
```

**Benefit**: Helps identify performance regressions during development.

### 7. Enhanced D3 Zoom Behavior

The `createZoomBehavior` function now accepts an optional `onZoom` callback for custom debouncing:

```typescript
const zoom = createZoomBehavior(svg, g, [0.1, 4], debouncedZoomHandler);
```

## Performance Utilities (`chart-performance.ts`)

New utility hooks for performance optimization:

### `useChartLoadingState(nodeCount)`
Returns loading state configuration based on dataset size.

### `useDebouncedZoom(callback, delay)`
Debounces zoom/pan handlers for smooth interactions.

### `useScheduledAnimation()`
Schedules animations using `requestAnimationFrame` to avoid layout thrashing.

### `usePerformanceMonitor(componentName, enabled)`
Tracks and logs component render times.

### `useNodePositions(nodes, width, nodeWidth, levelHeight, marginTop)`
Memoizes node position calculations.

### `useChartDimensions(containerWidth, nodeCount, minHeight)`
Memoizes chart dimension calculations.

### `useValidEdges(edges, nodePositions)`
Filters edges to only include those with valid source/target nodes.

### `useGenerationGroups(nodes)`
Memoizes generation grouping calculations.

### `useVisibleNodes(nodes, nodePositions, viewport)`
*(Prepared for future optimization)*
Returns only visible nodes within the viewport for virtual rendering.

## Performance Targets

Based on the implementation, expected performance:

| Dataset Size | Initial Render Time | Interaction FPS | Tooltip Response |
|-------------|--------------------|-----------------|--------------------|
| <500 people | <2s | 60fps | <100ms |
| 500-2000 people | 2-5s | 60fps | <100ms |
| 2000+ people | 5-10s | 60fps | <100ms |

## Files Modified

### New Files
- `/apps/web/src/lib/chart-performance.ts` - Performance utility hooks
- `/apps/web/src/components/charts/ChartSkeleton.tsx` - Loading skeleton component
- `/docs/PERFORMANCE_OPTIMIZATIONS.md` - This documentation

### Modified Files
- `/apps/web/src/lib/d3-utils.ts` - Enhanced zoom behavior
- `/apps/web/src/components/charts/AncestorChart.tsx` - Added optimizations
- `/apps/web/src/components/charts/DescendantChart.tsx` - Added optimizations
- `/apps/web/src/components/charts/HourglassChart.tsx` - Added optimizations
- `/apps/web/src/components/charts/FanChart.tsx` - Added optimizations
- `/apps/web/src/components/charts/BowtieChart.tsx` - Added optimizations
- `/apps/web/package.json` - Added dependencies

## Future Enhancements

### Virtual Rendering (Deferred)
The `useVisibleNodes` hook is prepared but not yet implemented in charts. This would:
- Only render nodes visible in the current viewport
- Dramatically improve performance for 5000+ person datasets
- Require more complex viewport tracking

### Canvas Rendering (Future)
For extremely large datasets (10,000+ people), consider:
- Switching from SVG to Canvas rendering
- WebGL acceleration for very large trees
- Progressive rendering with chunking

## Testing

All quality gates passed:
- ✅ Format check (`pnpm format`)
- ✅ Type check (`pnpm typecheck`)
- ✅ Lint check (`pnpm lint`)
- ✅ Build check (`pnpm build`)

## Backward Compatibility

All optimizations are backward compatible:
- Existing functionality maintained
- No breaking API changes
- Same visual appearance
- Same interaction patterns

## Usage

No changes required for consumers. The optimizations are transparent:

```tsx
// Usage remains the same
<AncestorChart
  nodes={nodes}
  edges={edges}
  onNodeClick={handleNodeClick}
  rootPersonId={personId}
/>
```

## Conclusion

These optimizations provide a solid foundation for handling large family trees efficiently. The implementation focuses on practical, high-impact improvements:

1. **Memoization** prevents unnecessary calculations
2. **Debouncing** ensures smooth 60fps interactions
3. **Loading states** provide user feedback
4. **Performance monitoring** aids development

The codebase is now prepared for future enhancements like virtual rendering and canvas-based visualization when needed for even larger datasets.
