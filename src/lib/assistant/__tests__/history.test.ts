import { describe, expect, it } from "vitest";
import {
  applyAssistantStreamEvent,
  canAccessConversation,
  conversationTitleFromUserContent,
  formatConversationTime,
  recordUrlFromToolResult,
  resultExcerptFromToolResult,
  sanitizeModelMessages,
  stripConfirmationTokens,
  userDisplayFromMessage,
} from "../history";

describe("conversation titles", () => {
  it("uses the first user sentence and trims it", () => {
    expect(
      conversationTitleFromUserContent("  Brief me on 608 Macon — schedule, cash, and risks  ")
    ).toBe("Brief me on 608 Macon — schedule, cash, and risks");
  });

  it("falls back to an attachment name", () => {
    expect(
      conversationTitleFromUserContent([
        { type: "attachment", file_name: "Monte-Cristo-invoice.pdf", storage_path: "assistant-inbox/a.pdf" },
      ])
    ).toBe("Monte-Cristo-invoice.pdf");
  });
});

describe("conversation access", () => {
  const row = {
    user_id: "user-1",
    surface: "admin",
    project_id: "job-1",
    deleted_at: null,
  };

  it("allows the owner on the same surface", () => {
    expect(canAccessConversation(row, "user-1", "admin")).toBe(true);
  });

  it("rejects another user, surface, deleted row, or a different job", () => {
    expect(canAccessConversation(row, "user-2", "admin")).toBe(false);
    expect(canAccessConversation(row, "user-1", "client")).toBe(false);
    expect(canAccessConversation({ ...row, deleted_at: "2026-08-22" }, "user-1", "admin")).toBe(
      false
    );
    expect(canAccessConversation(row, "user-1", "admin", "job-2")).toBe(false);
  });
});

describe("persistence sanitizers", () => {
  it("drops thinking and file bytes from stored model history", () => {
    const sanitized = sanitizeModelMessages([
      {
        role: "user",
        content: [
          { type: "thinking", thinking: "secret scratchpad", signature: "sig" },
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: "AAAA" },
          },
          { type: "attachment", storage_path: "assistant-inbox/a.pdf", file_name: "a.pdf" },
          { type: "text", text: "File this" },
        ],
      } as never,
    ]);

    const content = sanitized[0].content as unknown as Record<string, unknown>[];
    expect(content.some((block) => block.type === "thinking")).toBe(false);
    expect(content.some((block) => block.type === "document")).toBe(false);
    expect(content).toEqual(
      expect.arrayContaining([
        { type: "text", text: "[document omitted]" },
        expect.objectContaining({ type: "attachment", storage_path: "assistant-inbox/a.pdf" }),
        { type: "text", text: "File this" },
      ])
    );
  });

  it("strips approval tokens before transcripts are stored", () => {
    const stored = stripConfirmationTokens([
      {
        kind: "confirm",
        confirmation: {
          tool_use_id: "tool_1",
          name: "send_invoice",
          input: { invoice_id: "inv_1" },
          summary: "Send 608-MACON-001",
          token: "signed.secret",
        },
      },
    ]);
    expect(stored[0]).toMatchObject({
      kind: "confirm",
      confirmation: { tool_use_id: "tool_1", name: "send_invoice" },
    });
    expect((stored[0] as { confirmation: { token?: string } }).confirmation.token).toBeUndefined();
  });
});

describe("audit excerpts", () => {
  it("prefers a record URL and a concise result", () => {
    expect(
      recordUrlFromToolResult({
        invoice_number: "608-MACON-001",
        admin_page: "/admin/projects/job-1/invoices",
      })
    ).toBe("/admin/projects/job-1/invoices");
    expect(
      resultExcerptFromToolResult({
        invoice_number: "608-MACON-001",
        status: "sent",
      })
    ).toBe("608-MACON-001 · sent");
    expect(resultExcerptFromToolResult({ declined: true })).toBe("Declined");
  });
});

describe("display event reducer", () => {
  it("rebuilds the chat surface from stream events", () => {
    let items = [userDisplayFromMessage({ content: "Send the framing invoice" })];
    items = applyAssistantStreamEvent(items, { type: "text", text: "I'll prepare it." });
    items = applyAssistantStreamEvent(items, {
      type: "confirm_required",
      tool_use_id: "tool_1",
      name: "send_invoice",
      summary: "Send 608-MACON-001 for $12,500",
      token: "tok",
    });
    items = applyAssistantStreamEvent(items, {
      type: "confirm_resolved",
      tool_use_id: "tool_1",
      approved: true,
    });
    items = applyAssistantStreamEvent(items, { type: "tool_start", name: "send_invoice" });
    items = applyAssistantStreamEvent(items, {
      type: "tool_end",
      name: "send_invoice",
      actions: [{ url: "/admin/invoicing", label: "Open billing", kind: "page" }],
    });

    expect(items).toEqual([
      { kind: "user", text: "Send the framing invoice" },
      { kind: "assistant", text: "I'll prepare it." },
      {
        kind: "confirm",
        confirmation: {
          tool_use_id: "tool_1",
          name: "send_invoice",
          input: {},
          summary: "Send 608-MACON-001 for $12,500",
          token: "tok",
        },
        resolved: "approved",
      },
      { kind: "tool", name: "send_invoice", status: "done" },
      { kind: "action", url: "/admin/invoicing", label: "Open billing", document: false },
    ]);
  });
});

describe("relative conversation time", () => {
  it("uses a short operational label", () => {
    const now = Date.UTC(2026, 7, 22, 15);
    expect(formatConversationTime(new Date(now - 30_000).toISOString(), now)).toBe("Just now");
    expect(formatConversationTime(new Date(now - 12 * 60_000).toISOString(), now)).toBe("12m ago");
    expect(formatConversationTime(new Date(now - 3 * 60 * 60_000).toISOString(), now)).toBe("3h ago");
  });
});
