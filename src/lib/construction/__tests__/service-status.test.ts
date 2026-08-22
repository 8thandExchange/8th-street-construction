import { describe, expect, it } from "vitest";
import {
  canTransitionService,
  defaultSlaDue,
  serviceNeedsOwner,
  serviceSlaOverdue,
  serviceWaitingOnClient,
} from "../service-status";

describe("service request transitions", () => {
  it("runs open → assigned → in progress → waiting on client → resolved → closed", () => {
    expect(canTransitionService("open", "assigned")).toBe(true);
    expect(canTransitionService("assigned", "in_progress")).toBe(true);
    expect(canTransitionService("in_progress", "waiting_client")).toBe(true);
    expect(canTransitionService("waiting_client", "resolved")).toBe(true);
    expect(canTransitionService("resolved", "closed")).toBe(true);
    expect(canTransitionService("closed", "open")).toBe(false);
  });

  it("lets the client confirm a waiting request", () => {
    expect(serviceWaitingOnClient("waiting_client")).toBe(true);
    expect(serviceWaitingOnClient("in_progress")).toBe(false);
  });

  it("flags open work as needing an owner", () => {
    expect(serviceNeedsOwner("open")).toBe(true);
    expect(serviceNeedsOwner("closed")).toBe(false);
  });
});

describe("service SLA", () => {
  it("is overdue only while the request is still open and past the due date", () => {
    expect(
      serviceSlaOverdue({ status: "in_progress", slaDue: "2026-08-01", today: "2026-08-22" })
    ).toBe(true);
    expect(
      serviceSlaOverdue({ status: "closed", slaDue: "2026-08-01", today: "2026-08-22" })
    ).toBe(false);
    expect(
      serviceSlaOverdue({ status: "open", slaDue: "2026-08-30", today: "2026-08-22" })
    ).toBe(false);
  });

  it("defaults warranty to 7 days and service to 14", () => {
    expect(defaultSlaDue("2026-08-22", "warranty")).toBe("2026-08-29");
    expect(defaultSlaDue("2026-08-22", "service")).toBe("2026-09-05");
  });
});
