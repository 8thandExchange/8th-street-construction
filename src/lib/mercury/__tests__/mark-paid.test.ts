import { beforeEach, describe, expect, it, vi } from "vitest";

const sendInvoicePaidEmail = vi.fn(async () => undefined);
vi.mock("@/lib/email/invoice-notify", () => ({
  sendInvoicePaidEmail: (...args: unknown[]) =>
    (sendInvoicePaidEmail as (...a: unknown[]) => Promise<undefined>)(...args),
  sendInvoiceReadyEmail: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { markInvoicePaidLocally } from "../sync";

/**
 * Minimal chainable stand-in for the Supabase admin client. Records every
 * update() payload per table so assertions can inspect what was written.
 */
function fakeAdmin(invoiceRow: Record<string, unknown> | null) {
  const updates: Record<string, unknown[]> = {};

  function chain(table: string, mode: "select" | "update", payload?: unknown) {
    const self: Record<string, unknown> = {};
    const methods = ["select", "eq", "in", "not", "update", "single", "maybeSingle"];
    for (const m of methods) {
      self[m] = (...args: unknown[]) => {
        if (m === "update") {
          return chain(table, "update", args[0]);
        }
        if (m === "single" || m === "maybeSingle") {
          if (table === "invoices" && mode === "select") {
            return Promise.resolve({ data: invoiceRow });
          }
          if (table === "projects") return Promise.resolve({ data: { title: "608 Macon Avenue" } });
          if (table === "profiles")
            return Promise.resolve({ data: { email: "client@example.com", first_name: "Bernadette" } });
          return Promise.resolve({ data: null });
        }
        return self;
      };
    }
    // update chains resolve when awaited (thenable terminal .eq)
    if (mode === "update") {
      updates[table] = updates[table] ?? [];
      updates[table].push(payload);
      self.eq = () => Promise.resolve({ error: null });
    }
    return self;
  }

  return {
    updates,
    from: (table: string) => chain(table, "select"),
  };
}

const baseInvoice = {
  total: 35_950,
  invoice_number: "INV-0001",
  title: "Draw 1 — Site Work & Foundation",
  client_id: "client-uuid",
  status: "sent",
};

beforeEach(() => {
  sendInvoicePaidEmail.mockClear();
});

describe("markInvoicePaidLocally", () => {
  it("marks the invoice and linked draws paid and emails the client once", async () => {
    const admin = fakeAdmin({ ...baseInvoice });
    const ok = await markInvoicePaidLocally(admin as never, "inv-1", "proj-1");

    expect(ok).toBe(true);
    const invoiceUpdate = admin.updates["invoices"]?.[0] as Record<string, unknown>;
    expect(invoiceUpdate.status).toBe("paid");
    expect(invoiceUpdate.amount_paid).toBe(35_950);
    expect(invoiceUpdate.mercury_status).toBe("Paid");
    const drawUpdate = admin.updates["payment_draws"]?.[0] as Record<string, unknown>;
    expect(drawUpdate.status).toBe("paid");
    expect(sendInvoicePaidEmail).toHaveBeenCalledTimes(1);
  });

  it("is idempotent on notifications — already-paid invoices do not re-email", async () => {
    const admin = fakeAdmin({ ...baseInvoice, status: "paid" });
    const ok = await markInvoicePaidLocally(admin as never, "inv-1", "proj-1");

    expect(ok).toBe(true);
    expect(sendInvoicePaidEmail).not.toHaveBeenCalled();
  });

  it("suppresses the email when notifyClient is false", async () => {
    const admin = fakeAdmin({ ...baseInvoice });
    await markInvoicePaidLocally(admin as never, "inv-1", "proj-1", { notifyClient: false });
    expect(sendInvoicePaidEmail).not.toHaveBeenCalled();
  });

  it("returns false and writes nothing when the invoice does not exist", async () => {
    const admin = fakeAdmin(null);
    const ok = await markInvoicePaidLocally(admin as never, "missing", "proj-1");
    expect(ok).toBe(false);
    expect(admin.updates["invoices"]).toBeUndefined();
  });
});
