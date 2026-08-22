export type WorkflowSummary = {
  workflow: string;
  starts: number;
  completes: number;
  abandons: number;
  completionRate: number | null;
  medianDecisionMinutes: number | null;
};

type EventRow = {
  workflow: string;
  event: string;
  entity_id: string | null;
  created_at: string;
};

export function summarizeWorkflowEvents(rows: EventRow[]): WorkflowSummary[] {
  const byWorkflow = new Map<string, EventRow[]>();
  for (const row of rows) {
    const list = byWorkflow.get(row.workflow) ?? [];
    list.push(row);
    byWorkflow.set(row.workflow, list);
  }

  return [...byWorkflow.entries()]
    .map(([workflow, events]) => {
      const starts = events.filter((event) => event.event === "start").length;
      const completes = events.filter((event) => event.event === "complete").length;
      const abandons = events.filter((event) => event.event === "abandon").length;
      const decisions = events.filter(
        (event) => event.event === "complete" || event.event === "abandon"
      );
      const startByEntity = new Map<string, number>();
      for (const event of events) {
        if (event.event !== "start" || !event.entity_id) continue;
        if (!startByEntity.has(event.entity_id)) {
          startByEntity.set(event.entity_id, Date.parse(event.created_at));
        }
      }
      const deltas = decisions.flatMap((event) => {
        if (!event.entity_id) return [];
        const started = startByEntity.get(event.entity_id);
        if (started == null) return [];
        const delta = Date.parse(event.created_at) - started;
        return delta >= 0 ? [delta] : [];
      });
      const medianDecisionMinutes =
        deltas.length === 0 ? null : median(deltas) / 60_000;
      return {
        workflow,
        starts,
        completes,
        abandons,
        completionRate:
          starts + completes + abandons === 0
            ? null
            : completes / Math.max(starts, completes + abandons),
        medianDecisionMinutes,
      };
    })
    .sort((a, b) => b.completes + b.starts - (a.completes + a.starts));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
