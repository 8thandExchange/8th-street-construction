import type { GanttBar } from "@/lib/schedule/gantt";

type GanttDependencyLinesProps = {
  bars: GanttBar[];
  rowHeight: number;
};

export function GanttDependencyLines({ bars, rowHeight }: GanttDependencyLinesProps) {
  const indexById = new Map(bars.map((bar, index) => [bar.id, index]));
  const lines: { key: string; path: string }[] = [];

  for (const bar of bars) {
    if (!bar.predecessor_id || !bar.hasDates) continue;
    const predecessor = bars.find((item) => item.id === bar.predecessor_id);
    const predecessorIndex = indexById.get(bar.predecessor_id);
    const barIndex = indexById.get(bar.id);
    if (!predecessor?.hasDates || predecessorIndex == null || barIndex == null) continue;

    const fromX = predecessor.left + predecessor.width;
    const toX = bar.left;
    const fromY = predecessorIndex * rowHeight + rowHeight / 2;
    const toY = barIndex * rowHeight + rowHeight / 2;
    const elbowX = fromX + Math.max(1.5, (toX - fromX) / 2);

    lines.push({
      key: `${bar.predecessor_id}-${bar.id}`,
      path: `M ${fromX} ${fromY} H ${elbowX} V ${toY} H ${toX}`,
    });
  }

  if (!lines.length) return null;

  const height = bars.length * rowHeight;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0"
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {lines.map((line) => (
        <path
          key={line.key}
          d={line.path}
          fill="none"
          stroke="rgba(26,26,24,0.22)"
          strokeWidth={0.35}
          markerEnd="url(#gantt-arrow)"
        />
      ))}
      <defs>
        <marker
          id="gantt-arrow"
          markerWidth="4"
          markerHeight="4"
          refX="3.5"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L4,2 L0,4 Z" fill="rgba(26,26,24,0.35)" />
        </marker>
      </defs>
    </svg>
  );
}
