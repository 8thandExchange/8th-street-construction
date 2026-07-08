import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/actions/billing", () => ({
  createCustomInvoice: vi.fn(),
  sendCustomInvoice: vi.fn(),
  markInvoicePaid: vi.fn(),
}));

import {
  ASSISTANT_TOOLS,
  describeConfirmation,
  requiresConfirmation,
} from "../tools";

describe("requiresConfirmation", () => {
  it("gates every money-moving tool", () => {
    expect(requiresConfirmation("send_invoice", {})).toBe(true);
    expect(requiresConfirmation("mark_invoice_paid", {})).toBe(true);
  });

  it("gates portal access grants", () => {
    expect(requiresConfirmation("grant_project_access", {})).toBe(true);
  });

  it("gates create_invoice only when it sends immediately", () => {
    expect(requiresConfirmation("create_invoice", { send_now: true })).toBe(true);
    expect(requiresConfirmation("create_invoice", { send_now: false })).toBe(false);
    expect(requiresConfirmation("create_invoice", {})).toBe(false);
  });

  it("never gates read-only tools", () => {
    for (const name of [
      "list_projects",
      "find_people",
      "get_project_billing",
      "list_recent_leads",
      "company_snapshot",
    ]) {
      expect(requiresConfirmation(name, {})).toBe(false);
    }
  });
});

describe("describeConfirmation", () => {
  it("totals line items for a send-now invoice", () => {
    const summary = describeConfirmation("create_invoice", {
      title: "Framing draw",
      send_now: true,
      line_items: [
        { description: "Framing labor", quantity: 1, unit_amount: 10000 },
        { description: "Materials", quantity: 2, unit_amount: 1250 },
      ],
    });
    expect(summary).toContain("Framing draw");
    expect(summary).toContain("$12,500");
    expect(summary.toLowerCase()).toContain("mercury");
  });
});

describe("tool schema", () => {
  it("every gated tool exists in the tool list", () => {
    const names = new Set(ASSISTANT_TOOLS.map((t) => t.name));
    expect(names.has("create_invoice")).toBe(true);
    expect(names.has("send_invoice")).toBe(true);
    expect(names.has("mark_invoice_paid")).toBe(true);
  });
});
