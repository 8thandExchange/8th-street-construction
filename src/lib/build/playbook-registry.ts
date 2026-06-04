import { GEORGIA_RESIDENTIAL_PLAYBOOK } from "./georgia-residential-playbook";
import { SOUTH_CAROLINA_RESIDENTIAL_PLAYBOOK } from "./south-carolina-residential-playbook";
import type { BuildPlaybook } from "./playbook-types";

export const BUILD_PLAYBOOKS: BuildPlaybook[] = [
  GEORGIA_RESIDENTIAL_PLAYBOOK,
  SOUTH_CAROLINA_RESIDENTIAL_PLAYBOOK,
];

export const DEFAULT_PLAYBOOK_ID = GEORGIA_RESIDENTIAL_PLAYBOOK.id;

export function getPlaybookById(id: string): BuildPlaybook | null {
  return BUILD_PLAYBOOKS.find((p) => p.id === id) ?? null;
}

export function listPlaybooks() {
  return BUILD_PLAYBOOKS.map((p) => ({
    id: p.id,
    name: p.name,
    state: p.state,
    version: p.version,
    phaseCount: p.milestones.length,
    taskCount: p.milestones.reduce((n, m) => n + m.tasks.length, 0),
  }));
}
