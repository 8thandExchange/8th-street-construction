export type PlaybookTaskTemplate = {
  title: string;
  description?: string;
  priority?: "low" | "normal" | "high" | "urgent";
};

export type PlaybookMilestoneTemplate = {
  phaseKey: string;
  title: string;
  description: string;
  clientSummary: string;
  tasks: PlaybookTaskTemplate[];
};

export type BuildPlaybook = {
  id: string;
  name: string;
  version: string;
  state: "GA" | "SC";
  description: string;
  milestones: PlaybookMilestoneTemplate[];
};
