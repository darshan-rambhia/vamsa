# UX/UI Review: Visualize Route & Charts (combined)

Comprehensive review of `/_authenticated/visualize` and all chart components. Includes layout, controls, per-chart UX, accessibility, and data-clarity guidance.

## Layout & Responsiveness (visualize.tsx)
- Controls + chart + legend stack vertically; on smaller screens the chart is pushed below the fold. Consider a desktop layout with a left sidebar for controls, keeping the chart/legend full-height on the right. On mobile, collapse controls into a drawer/accordion labeled "Chart settings."
- Chart area is fixed around 600px tall; allow it to size with viewport (e.g., `min-h-[60vh]` with sensible max) to reduce scrolling on small screens and wasted space on large monitors.
- Add a page-level help affordance: "Drag to pan, scroll/pinch to zoom, click a node for details." Include a visible "Reset view" action near the chart.

## Chart Controls (ChartControls.tsx)
- Toolbar is dense and wraps on medium screens. Group the four export buttons into a single "Export / Share" menu. Move secondary inputs ("Sort by", "Max people") into a "View settings" popover to declutter.
- Add precise numeric inputs next to sliders for generation counts / max people for users who dislike dragging.
- Show current sort/filter context near the chart (e.g., a small pill) so users see active settings even when the control is offscreen.
- Make the export target explicit; if multiple SVGs exist, clarify which chart is exported and include the chart title in the filename prompt.

## Cross-chart interaction
- Provide a "Find person" input that highlights and centers a matching node across tree-like charts. Today users must pan/zoom manually.
- Surface zoom/pan controls (fit-to-center, +/-, current zoom level). Zoom exists but is undiscoverable.
- Add an overview/minimap or "Center on selected" button for very wide/deep trees.
- Tooltips are hover-only; add tap-friendly triggers and a close affordance for touch users.
- Improve empty/error states with next steps (e.g., add birth/death dates for timeline, reduce max-people for matrix).

## Tree / Ancestor / Descendant / Hourglass / Fan / Compact
- Nodes (180×60) truncate long names; allow two-line wrapping with second-line ellipsis to disambiguate siblings. Consider dynamic width if layout permits.
- Add visible zoom controls and a quick "Fit to center" reset; not all users know wheel or trackpad gestures.
- Provide keyboard focus/activation for nodes (`role="button"`, `tabIndex=0`, Enter/Space handlers) and a textual "List view" alternative for screen readers.
- Consider an overview/minimap for large generations to reframe quickly after long pans.

## Bowtie
- Paternal vs maternal color coding is only in the legend; add side labels or subtle background bands to convey the split at a glance.
- Inline hint that clicking a node recenters the chart (align with "Set as Center" tooltip action).

## Timeline
- Add a year-range brush/slider to focus on eras; current zoom relies on wheel gestures.
- Provide Living/Deceased and Gender toggles so color encodings have matching controls.
- Surface the active sort (birth/death/name) as a pill near the chart and offer a one-click reset to default.
- Add row hover highlight and a tooltip with full name and exact years; left labels currently truncate long names.

## Relationship Matrix
- Names are truncated (~15-18 chars). Add tooltips or wrapping to show full names and life dates to disambiguate duplicates.
- Highlight the active row/column on hover to aid scanning; today every cell has equal weight.
- Legend only covers Parent/Child/Spouse/Sibling while matrix encodes in-law and step ties; expand the legend and add cell tooltips with full relationship text.
- Add a "Sort by" control (alphabetical, closeness to selected person) to reduce clutter when many people are shown.

## Statistics (StatisticsCharts.tsx)
- Summary cards: add thousands separators and context text (e.g., "out of N"), plus percentages where relevant.
- Empty states should guide users ("Add birth/death dates to see lifespan trends," "Add birth locations to unlock this chart").
- Ensure gender colors align with design tokens and pass color-blind checks; add a short legend when labels are hidden by space constraints.
- Manage pie label overlap by grouping tiny slices into "Other" when needed.

## Legend & Stats Panel
- Legends sit below the chart; allow toggling or floating positioning so they stay visible while panning/zooming.
- Stats panel is hidden for Statistics charts; consider a compact header summarizing sample sizes and data freshness to build trust in aggregates.

## Performance & Feedback
- Keep loading lightweight for minor interactions (pan/zoom), but show clear "Updating…" for fetch-triggering changes (chart type, generations). Avoid blocking the chart during small tweaks.
- Add a "Retry" action in error states; network hiccups shouldn't force a page refresh.

## Accessibility & Text Scaling
- Make SVG nodes focusable/operable via keyboard; mirror click handlers on Enter/Space.
- Provide a "Skip to chart" and optionally a list/table alternative for screen readers.
- Verify behavior under browser text zoom; SVG text may not scale like HTML—ensure legibility at 125-150%.

## Shareability
- Update document title dynamically (e.g., "Visualize - Ancestor Chart for Jane Doe") and preserve chart type/params in query string for shareable links.
