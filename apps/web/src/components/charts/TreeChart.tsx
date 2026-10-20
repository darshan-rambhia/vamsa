import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@vamsa/ui";
import { ChartSkeleton } from "./ChartSkeleton";
import { TreeExportSvg } from "./TreeExportSvg";
import { ZoomControls } from "./ZoomControls";
import { useChartViewport } from "./useChartViewport";
import type { LayoutCard, TextMeasurer } from "~/lib/tree-layout";
import type { ChartEdge, ChartNode } from "~/server/charts";
import { computeTreeLayout } from "~/lib/tree-layout";
import { useChartLoadingState } from "~/lib/chart-performance";

interface TreeChartProps {
  nodes: Array<ChartNode>;
  edges: Array<ChartEdge>;
  /** Called when the user asks to re-center the tree on a person */
  onNodeClick?: (nodeId: string) => void;
  rootPersonId?: string;
  resetSignal?: number;
  /** "full" expands every collapsed relative; "focused" shows the direct line */
  view?: "focused" | "full";
  /** Comma-separated person ids whose siblings are expanded (URL-backed) */
  expandedParam?: string;
  onExpandedChange?: (ids: Array<string>) => void;
}

const MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };
const LINE_COLOR =
  "color-mix(in oklch, var(--color-muted-foreground) 55%, var(--color-background))";
const DRAG_THRESHOLD = 5;
const MIN_FIT_SCALE = 0.85;
const DRAWER_WIDTH = 320;
const DRAWER_MARGIN = 24;
const GUTTER_SCREEN_WIDTH = 136;
const FONT_STACK = '"Source Sans 3", system-ui, sans-serif';

const parseExpanded = (param?: string): ReadonlySet<string> =>
  new Set((param ?? "").split(",").filter(Boolean));

/** Canvas-based text measurement using the card fonts, once fonts are ready */
function useTextMeasurer(): TextMeasurer | undefined {
  const [measurer, setMeasurer] = useState<TextMeasurer>();
  useEffect(() => {
    let cancelled = false;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    const fonts = {
      name: `600 14px ${FONT_STACK}`,
      subtitle: `400 12px ${FONT_STACK}`,
    };
    const cache = new Map<string, number>();
    const measure: TextMeasurer = (text, kind) => {
      const key = `${kind}|${text}`;
      let width = cache.get(key);
      if (width === undefined) {
        ctx.font = fonts[kind];
        width = ctx.measureText(text).width;
        cache.set(key, width);
      }
      return width;
    };
    const ready = Promise.all([
      document.fonts.load(fonts.name),
      document.fonts.load(fonts.subtitle),
    ])
      .then(() => document.fonts.ready)
      .catch(() => undefined);
    void ready.then(() => {
      if (!cancelled) setMeasurer(() => measure);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return measurer;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function Avatar({
  initials,
  deceased,
  filled,
  size,
}: {
  initials: string;
  deceased: boolean;
  filled?: boolean;
  size: number;
}) {
  const tone = filled
    ? "bg-primary-foreground/20 text-primary-foreground"
    : deceased
      ? "bg-muted text-muted-foreground border border-border"
      : "bg-primary/15 text-primary";
  return (
    <span
      aria-hidden="true"
      className={`font-display flex shrink-0 items-center justify-center rounded-full font-semibold ${tone} ${
        deceased && !filled ? "opacity-70" : ""
      }`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

function TreeChartComponent({
  nodes,
  edges,
  onNodeClick,
  rootPersonId,
  resetSignal,
  view = "focused",
  expandedParam,
  onExpandedChange,
}: TreeChartProps) {
  const navigate = useNavigate();
  const viewport = useChartViewport({
    margin: MARGIN,
    resetSignal,
    minHeight: 200,
  });
  const loadingState = useChartLoadingState(nodes.length);

  const focusId = rootPersonId || nodes[0]?.id || "";
  const measureText = useTextMeasurer();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() =>
    parseExpanded(expandedParam)
  );
  // Follow the URL (reload, back/forward, shared links)
  useEffect(() => {
    setExpanded(parseExpanded(expandedParam));
  }, [expandedParam]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerCardId, setDrawerCardId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const dragMoved = useRef(false);

  // Clear the selection when the tree is re-centered
  useEffect(() => {
    setSelectedId(null);
  }, [focusId]);

  const layout = useMemo(
    () =>
      computeTreeLayout({
        people: nodes,
        relations: edges,
        focusId,
        expanded,
        expandAll: view === "full",
        measureText,
      }),
    [nodes, edges, focusId, expanded, view, measureText]
  );

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Fit content whenever the layout changes. Below the minimum readable scale
  // we center the focus card instead and let the user pan.
  const { fitContent } = viewport;
  useEffect(() => {
    if (layout.cards.length === 0) return;
    const focus = layout.cards.find((c) => c.isFocus);
    fitContent(layout.bounds, {
      minFitScale: MIN_FIT_SCALE,
      focusPoint: focus && {
        x: focus.x + focus.width / 2,
        y: focus.y + focus.height / 2,
      },
    });
  }, [layout, fitContent]);

  // Pan smoothly when the drawer would cover the selected card
  const transformRef = useRef(viewport.transform);
  transformRef.current = viewport.transform;
  const containerWidthRef = useRef(0);
  containerWidthRef.current = viewport.dimensions.width;
  const [panning, setPanning] = useState(false);
  const { panBy } = viewport.controls;
  useEffect(() => {
    if (!selectedId) return;
    const card = layout.cards.find((c) => c.id === selectedId);
    if (!card) return;
    const t = transformRef.current;
    const drawerLeft = containerWidthRef.current - DRAWER_WIDTH - DRAWER_MARGIN;
    const left = card.x * t.scale + t.x;
    const right = (card.x + card.width) * t.scale + t.x;
    let dx = 0;
    if (right > drawerLeft) dx = drawerLeft - right;
    const minLeft = GUTTER_SCREEN_WIDTH + DRAWER_MARGIN;
    if (left + dx < minLeft) dx = minLeft - left;
    if (dx === 0) return;
    setPanning(true);
    panBy(dx, 0);
    const timer = window.setTimeout(() => setPanning(false), 350);
    return () => window.clearTimeout(timer);
    // only when the selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const closeDrawer = useCallback(() => setSelectedId(null), []);

  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, closeDrawer]);

  const toggleExpanded = useCallback(
    (key: string) => {
      const next = new Set(expanded);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setExpanded(next);
      onExpandedChange?.(Array.from(next).sort());
    },
    [expanded, onExpandedChange]
  );

  const openCard = useCallback((card: LayoutCard) => {
    if (dragMoved.current) return;
    setSelectedId(card.id);
    setDrawerCardId(card.id);
  }, []);

  const inDrawer = (e: React.SyntheticEvent) =>
    e.target instanceof Element && e.target.closest("[data-no-pan]") !== null;

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!inDrawer(e)) viewport.handlers.onWheel(e);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (inDrawer(e)) return;
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    dragMoved.current = false;
    viewport.handlers.onMouseDown(e);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current;
    if (
      origin &&
      Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > DRAG_THRESHOLD
    ) {
      dragMoved.current = true;
    }
    viewport.handlers.onMouseMove(e);
  };

  const drawerCard = layout.cards.find((c) => c.id === drawerCardId) ?? null;
  const drawerNode = drawerCardId ? nodeById.get(drawerCardId) : undefined;
  const drawerOpen = selectedId !== null && drawerCard !== null;

  if (loadingState.isLoading) {
    return (
      <ChartSkeleton
        message={loadingState.message || undefined}
        estimatedTime={loadingState.estimatedTime}
      />
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="bg-card flex h-full w-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={viewport.containerRef}
      className="bg-background relative h-full w-full overflow-hidden rounded-lg border"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={viewport.handlers.onMouseUp}
      onMouseLeave={viewport.handlers.onMouseLeave}
      style={{ cursor: viewport.isDragging ? "grabbing" : "grab" }}
    >
      {!viewport.isReady ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="bg-primary/20 h-12 w-12 animate-pulse rounded-full" />
        </div>
      ) : (
        <>
          <div
            data-testid="tree-canvas"
            className="absolute top-0 left-0"
            style={{
              transform: `translate(${viewport.transform.x}px, ${viewport.transform.y}px) scale(${viewport.transform.scale})`,
              transformOrigin: "0 0",
              transition: panning ? "transform 300ms ease-out" : undefined,
              width: 1,
              height: 1,
            }}
          >
            <svg
              width={1}
              height={1}
              className="absolute top-0 left-0"
              style={{ overflow: "visible" }}
              aria-hidden="true"
            >
              {layout.connectors.map((c) => (
                <path
                  key={c.id}
                  d={c.d}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray={c.dashed ? "5 4" : undefined}
                  style={{ stroke: LINE_COLOR }}
                />
              ))}
            </svg>

            {layout.cards.map((card) => {
              const selected = card.id === selectedId;
              // Inline: a global button rule overrides border-color utilities
              const borderColor = selected
                ? "var(--color-muted-foreground)"
                : card.blood
                  ? "var(--color-primary)"
                  : "var(--color-border)";
              const fill = "bg-card text-card-foreground";
              return (
                <button
                  key={card.id}
                  type="button"
                  data-testid={`tree-card-${card.id}`}
                  aria-label={`${card.name}, ${card.relation}`}
                  aria-pressed={selected}
                  onClick={() => openCard(card)}
                  className={`focus-visible:ring-ring absolute flex items-start gap-2.5 rounded-lg border-2 p-3 text-left transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 ${fill}`}
                  style={{
                    left: card.x,
                    top: card.y,
                    width: card.width,
                    height: card.height,
                    borderColor,
                    borderWidth: card.isFocus ? 3 : 2,
                    padding: card.isFocus ? 11 : 12,
                    backgroundColor: card.isFocus
                      ? "color-mix(in oklch, var(--color-primary) 14%, var(--color-card))"
                      : undefined,
                    boxShadow: selected
                      ? "0 0 0 4px color-mix(in oklch, var(--color-muted-foreground) 30%, transparent)"
                      : undefined,
                  }}
                >
                  <Avatar
                    initials={card.initials}
                    deceased={card.deceased}
                    size={36}
                  />
                  <span className="min-w-0 flex-1">
                    {card.nameLines.map((line, i) => (
                      <span
                        key={i}
                        className="block text-sm leading-[18px] font-semibold whitespace-nowrap"
                      >
                        {line}
                      </span>
                    ))}
                    {card.subtitleLines.map((line, i) => (
                      <span
                        key={i}
                        className={`block text-xs leading-[15px] whitespace-nowrap ${"text-muted-foreground"}`}
                      >
                        {line}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}

            {layout.pills.map((pill) => (
              <button
                key={`pill-${pill.key}`}
                type="button"
                data-testid={`tree-pill-${pill.key}`}
                aria-expanded={pill.expanded}
                aria-label={
                  pill.expanded
                    ? "Hide additional relatives"
                    : `Show ${pill.label.replace("+", "")}`
                }
                onClick={() => {
                  if (!dragMoved.current) toggleExpanded(pill.key);
                }}
                className="bg-card text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground focus-visible:ring-ring absolute rounded-full border text-xs font-medium transition-colors duration-200 focus-visible:ring-2"
                style={{
                  left: pill.x,
                  top: pill.y,
                  width: pill.width,
                  height: pill.height,
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Click-to-open drawer, slides over the tree from the right */}
          <aside
            role="dialog"
            aria-label="Person details"
            aria-hidden={!drawerOpen}
            inert={!drawerOpen}
            data-testid="tree-drawer"
            data-no-pan="true"
            className={`bg-popover text-popover-foreground border-border absolute top-0 right-0 z-20 flex h-full w-80 max-w-full cursor-default flex-col border-l shadow-xl transition-transform duration-300 ease-out ${
              drawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {drawerCard && (
              <>
                <div className="flex items-start justify-between p-4 pb-2">
                  <Avatar
                    initials={drawerCard.initials}
                    deceased={drawerCard.deceased}
                    size={56}
                  />
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={closeDrawer}
                    aria-label="Close details"
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md p-1 focus-visible:ring-2"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="px-4">
                  <h2
                    className="font-display leading-tight font-medium break-words"
                    style={{ fontSize: "1.25rem" }}
                  >
                    {drawerCard.name}
                    {drawerCard.deceased ? " †" : ""}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {drawerCard.relation}
                  </p>
                </div>
                <dl className="mt-4 space-y-3 px-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                      Born
                    </dt>
                    <dd>{formatDate(drawerNode?.dateOfBirth)}</dd>
                  </div>
                  {drawerCard.deceased && (
                    <div>
                      <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                        Died
                      </dt>
                      <dd>{formatDate(drawerNode?.dateOfPassing)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                      Status
                    </dt>
                    <dd>{drawerCard.deceased ? "Deceased" : "Living"}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-col gap-2 p-4">
                  <Button
                    onClick={() =>
                      navigate({
                        to: "/people/$personId",
                        params: { personId: drawerCard.id },
                      })
                    }
                  >
                    View profile
                  </Button>
                  <Button
                    variant="outline"
                    disabled={drawerCard.isFocus}
                    onClick={() => {
                      onNodeClick?.(drawerCard.id);
                      closeDrawer();
                    }}
                  >
                    Center tree here
                  </Button>
                </div>
              </>
            )}
          </aside>

          {/* Generation labels: pinned to the left edge, y follows pan/zoom */}
          <div
            data-testid="tree-gutter"
            aria-hidden="true"
            className="bg-background/90 border-border absolute top-0 bottom-0 left-0 z-10 border-r backdrop-blur-sm select-none"
            style={{ width: GUTTER_SCREEN_WIDTH }}
          >
            {layout.rows.map((row) => (
              <div
                key={`label-${row.row}`}
                className="text-muted-foreground absolute right-3 left-3 flex h-8 items-center text-xs leading-4 font-semibold tracking-wider"
                style={{
                  top:
                    (row.y + row.height / 2) * viewport.transform.scale +
                    viewport.transform.y -
                    16,
                  transition: panning ? "top 300ms ease-out" : undefined,
                }}
              >
                {row.label}
              </div>
            ))}
          </div>

          <TreeExportSvg layout={layout} />

          <ZoomControls
            scale={viewport.transform.scale}
            onZoomIn={viewport.controls.zoomIn}
            onZoomOut={viewport.controls.zoomOut}
            onReset={viewport.controls.reset}
          />
        </>
      )}
    </div>
  );
}

export const TreeChart = memo(TreeChartComponent);
