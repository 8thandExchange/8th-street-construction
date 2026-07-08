import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  CLIENT_ASSISTANT_TOOLS,
  clientRequiresConfirmation,
  describeClientConfirmation,
  executeClientAssistantTool,
  type ClientAssistantContext,
} from "../client-tools";

const PROJECT = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "608 Macon Avenue",
  status: "in_progress",
  target_completion_date: "2026-12-01",
};

function ctxWith(projects = [PROJECT]): ClientAssistantContext {
  return {
    // Tools under test never reach the client for the scoping cases below.
    supabase: {} as ClientAssistantContext["supabase"],
    userId: "user-1",
    firstName: "Gary",
    projects,
  };
}

describe("clientRequiresConfirmation", () => {
  it("gates only the message send", () => {
    expect(clientRequiresConfirmation("send_message_to_team")).toBe(true);
    for (const name of [
      "get_schedule",
      "get_recent_updates",
      "get_billing_summary",
      "get_documents",
      "get_messages",
    ]) {
      expect(clientRequiresConfirmation(name)).toBe(false);
    }
  });

  it("previews the message body in the approval card", () => {
    const summary = describeClientConfirmation("send_message_to_team", {
      body: "Can we schedule a volunteer day for the 20th?",
    });
    expect(summary).toContain("volunteer day for the 20th");
  });
});

describe("project scoping", () => {
  it("rejects a project id the client does not have access to", async () => {
    const result = (await executeClientAssistantTool(ctxWith(), "get_schedule", {
      project_id: "99999999-9999-9999-9999-999999999999",
    })) as { error?: string };
    expect(result.error).toBeTruthy();
  });

  it("errors when the account has no projects", async () => {
    const result = (await executeClientAssistantTool(ctxWith([]), "get_schedule", {})) as {
      error?: string;
    };
    expect(result.error).toContain("No projects");
  });

  it("requires a project_id when the account has several projects", async () => {
    const second = { ...PROJECT, id: "22222222-2222-2222-2222-222222222222", title: "Second" };
    const result = (await executeClientAssistantTool(
      ctxWith([PROJECT, second]),
      "get_schedule",
      {}
    )) as { error?: string };
    expect(result.error).toContain("project_id");
  });

  it("rejects an empty message body before touching the database", async () => {
    const result = (await executeClientAssistantTool(ctxWith(), "send_message_to_team", {
      body: "   ",
    })) as { error?: string };
    expect(result.error).toContain("empty");
  });
});

describe("tool schema", () => {
  it("exposes exactly the client tool surface — no admin tools", () => {
    const names = CLIENT_ASSISTANT_TOOLS.map((t) => t.name).sort();
    expect(names).toEqual([
      "get_billing_summary",
      "get_documents",
      "get_messages",
      "get_recent_updates",
      "get_schedule",
      "send_message_to_team",
    ]);
  });
});
