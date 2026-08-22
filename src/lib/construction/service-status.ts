export const SERVICE_CATEGORIES = ["warranty", "service"] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_STATUSES = [
  "draft",
  "open",
  "assigned",
  "in_progress",
  "waiting_client",
  "resolved",
  "closed",
  "void",
] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const SERVICE_IMAGE_KINDS = ["evidence", "closeout"] as const;
export type ServiceImageKind = (typeof SERVICE_IMAGE_KINDS)[number];

const SERVICE_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  draft: ["open", "void"],
  open: ["assigned", "in_progress", "void"],
  assigned: ["in_progress", "waiting_client", "void"],
  in_progress: ["waiting_client", "resolved", "void"],
  waiting_client: ["in_progress", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: ["void"],
  void: [],
};

export function canTransitionService(from: ServiceStatus, to: ServiceStatus): boolean {
  return SERVICE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function serviceNeedsOwner(status: ServiceStatus): boolean {
  return status === "open" || status === "assigned" || status === "in_progress";
}

export function serviceWaitingOnClient(status: ServiceStatus): boolean {
  return status === "waiting_client";
}

export function serviceIsOpen(status: ServiceStatus): boolean {
  return !["resolved", "closed", "void", "draft"].includes(status);
}

export function serviceSlaOverdue(input: {
  status: ServiceStatus;
  slaDue: string | null;
  today: string;
}): boolean {
  if (!input.slaDue) return false;
  if (!serviceIsOpen(input.status)) return false;
  return input.slaDue < input.today;
}

export function defaultSlaDue(today: string, category: ServiceCategory): string {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (category === "warranty" ? 7 : 14));
  return date.toISOString().slice(0, 10);
}
