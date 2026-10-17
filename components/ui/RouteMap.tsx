import { MAP_OUTLINE, MAP_VIEWBOX, PLACE_NAMES, place, routePath, type Place } from "@/lib/route";

/**
 * A stylised island with the journey drawn as a gold line. Each segment carries
 * data-route-segment so scroll scenes can draw it (stroke-dashoffset 1 → 0, pathLength 1).
 */
export function RouteMap({
  segments,
  drawn = segments.length,
  labels = [],
  className = "",
  tone = "light",
  labelSize = 17,
  currentSegment,
}: {
  segments: Place[][];
  /** Segments before this index render fully drawn (others start hidden for animation). */
  drawn?: number;
  labels?: Place[];
  className?: string;
  tone?: "light" | "dark";
  labelSize?: number;
  /** Marks the segment a scroll scene draws (data-current). */
  currentSegment?: number;
}) {
  const ink = tone === "light" ? "var(--color-ivory)" : "var(--color-forest-900)";
  const stops = Array.from(new Set(segments.flat()));
  return (
    <svg viewBox={MAP_VIEWBOX} className={className} fill="none" aria-hidden="true">
      <path d={MAP_OUTLINE} fill={ink} fillOpacity={tone === "light" ? 0.08 : 0.06} stroke={ink} strokeOpacity={0.55} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
      {segments.map((seg, i) => (
        <path
          key={i}
          data-route-segment={i}
          data-current={i === currentSegment ? "" : undefined}
          d={routePath(seg)}
          stroke="var(--color-gold)"
          strokeWidth={2.2}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={i < drawn ? 0 : 1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {stops.map((p) => {
        const [x, y] = place(p);
        return (
          <g key={p} data-route-stop={p}>
            <circle cx={x} cy={y} r={labelSize / 3.6} fill={ink} />
            {labels.includes(p) && (
              <text x={x + labelSize * 0.6} y={y + labelSize * 0.32} fill={ink} fontSize={labelSize} fontFamily="var(--font-sans)">
                {PLACE_NAMES[p]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
