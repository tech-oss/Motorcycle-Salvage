"use client";

type Segment = { label: string; value: number; color: string };

const SIZE = 140;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ segments }: { segments: readonly Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  const arcs = segments.reduce<
    Array<Segment & { fraction: number; dasharray: string; dashoffset: number }>
  >((acc, segment) => {
    const consumed = acc.reduce((sum, a) => sum + a.fraction * CIRCUMFERENCE, 0);
    const fraction = segment.value / total;
    const dash = fraction * CIRCUMFERENCE;
    acc.push({
      ...segment,
      fraction,
      dasharray: `${dash} ${CIRCUMFERENCE - dash}`,
      dashoffset: -consumed,
    });
    return acc;
  }, []);

  return (
    <div className="flex items-center gap-5">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90 shrink-0"
        role="img"
        aria-label="Distribution chart"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
        />
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeDasharray={arc.dasharray}
            strokeDashoffset={arc.dashoffset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <ul className="flex flex-1 flex-col gap-2.5 text-sm">
        {arcs.map((arc) => (
          <li key={arc.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: arc.color }}
                aria-hidden="true"
              />
              {arc.label}
            </span>
            <span className="font-medium text-foreground">
              {arc.value}{" "}
              <span className="text-muted-foreground">
                ({Math.round(arc.fraction * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
