import type { TreeLayout } from "~/lib/tree-layout";
import { CARD_WIDTH } from "~/lib/tree-layout";

const PAD = 40;
const FONT = "Source Sans 3, system-ui, sans-serif";
const LINE = "var(--color-muted-foreground)";

/**
 * Off-screen SVG rendering of the whole tree (cards, connectors, pills,
 * labels). The on-screen tree uses HTML cards, which svg-based exporters can't
 * capture, so exports read this element instead. Colors use CSS variables that
 * the export helpers resolve to hex.
 */
export function TreeExportSvg({ layout }: { layout: TreeLayout }) {
  const { bounds } = layout;
  const minX = bounds.minX - PAD;
  const minY = bounds.minY - PAD;
  const width = bounds.maxX - bounds.minX + PAD * 2;
  const height = bounds.maxY - bounds.minY + PAD * 2;

  return (
    <svg
      data-chart-svg="true"
      data-testid="tree-export-svg"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`${minX} ${minY} ${width} ${height}`}
      style={{
        position: "absolute",
        left: -100000,
        top: 0,
        pointerEvents: "none",
      }}
    >
      <rect
        x={minX}
        y={minY}
        width={width}
        height={height}
        fill="var(--color-background)"
      />
      {layout.connectors.map((c) => (
        <path
          key={c.id}
          d={c.d}
          fill="none"
          stroke={LINE}
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeDasharray={c.dashed ? "5 4" : undefined}
        />
      ))}
      {layout.rows.map((row) => (
        <text
          key={row.row}
          x={bounds.minX}
          y={row.y + row.height / 2 + 4}
          fontFamily={FONT}
          fontSize={12}
          fontWeight={600}
          letterSpacing={1.5}
          fill={LINE}
        >
          {row.label}
        </text>
      ))}
      {layout.cards.map((card) => {
        const nameBlock = card.nameLines.length * 18;
        return (
          <g key={card.id}>
            <rect
              x={card.x + 1}
              y={card.y + 1}
              width={CARD_WIDTH - 2}
              height={card.height - 2}
              rx={8}
              fill="var(--color-card)"
              stroke={
                card.blood ? "var(--color-primary)" : "var(--color-border)"
              }
              strokeWidth={card.isFocus ? 3 : 2}
            />
            {card.isFocus && (
              <rect
                x={card.x + 3}
                y={card.y + 3}
                width={CARD_WIDTH - 6}
                height={card.height - 6}
                rx={6}
                fill="color-mix(in oklch, var(--color-primary) 14%, transparent)"
              />
            )}
            <circle
              cx={card.x + 14 + 18}
              cy={card.y + 14 + 18}
              r={18}
              fill={
                card.deceased
                  ? "var(--color-muted)"
                  : "color-mix(in oklch, var(--color-primary) 15%, transparent)"
              }
              stroke={card.deceased ? "var(--color-border)" : undefined}
              opacity={card.deceased ? 0.7 : 1}
            />
            <text
              x={card.x + 14 + 18}
              y={card.y + 14 + 18 + 5}
              textAnchor="middle"
              fontFamily={FONT}
              fontSize={14}
              fontWeight={600}
              fill={
                card.deceased
                  ? "var(--color-muted-foreground)"
                  : "var(--color-primary)"
              }
            >
              {card.initials}
            </text>
            {card.nameLines.map((line, i) => (
              <text
                key={`n${i}`}
                x={card.x + 60}
                y={card.y + 14 + i * 18 + 13}
                fontFamily={FONT}
                fontSize={14}
                fontWeight={600}
                fill="var(--color-card-foreground)"
              >
                {line}
              </text>
            ))}
            {card.subtitleLines.map((line, i) => (
              <text
                key={`s${i}`}
                x={card.x + 60}
                y={card.y + 14 + nameBlock + i * 15 + 11}
                fontFamily={FONT}
                fontSize={12}
                fill="var(--color-muted-foreground)"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
      {layout.pills.map((pill) => (
        <g key={pill.key}>
          <rect
            x={pill.x}
            y={pill.y}
            width={pill.width}
            height={pill.height}
            rx={pill.height / 2}
            fill="var(--color-card)"
            stroke="var(--color-border)"
          />
          <text
            x={pill.x + pill.width / 2}
            y={pill.y + pill.height / 2 + 4}
            textAnchor="middle"
            fontFamily={FONT}
            fontSize={12}
            fontWeight={500}
            fill="var(--color-muted-foreground)"
          >
            {pill.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
