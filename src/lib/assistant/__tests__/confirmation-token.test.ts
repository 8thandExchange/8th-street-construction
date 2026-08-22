import { describe, expect, it } from "vitest";
import {
  signAssistantAction,
  verifyAssistantAction,
} from "../confirmation-token";

describe("assistant confirmation tokens", () => {
  const secret = "test-secret-that-never-leaves-the-server";
  const now = Date.UTC(2026, 7, 22, 12);

  it("binds approval to the exact tool name and input", () => {
    const token = signAssistantAction(
      {
        toolUseId: "tool_123",
        name: "update_milestone",
        input: { milestone_id: "phase_1", target_date: "2026-09-10" },
      },
      secret,
      now
    );

    expect(verifyAssistantAction(token, secret, now + 1000)).toMatchObject({
      toolUseId: "tool_123",
      name: "update_milestone",
      input: { milestone_id: "phase_1", target_date: "2026-09-10" },
    });
  });

  it("rejects tampered and expired approvals", () => {
    const token = signAssistantAction(
      { toolUseId: "tool_123", name: "send_invoice", input: { invoice_id: "inv_1" } },
      secret,
      now
    );
    const [payload, signature] = token.split(".");

    expect(() =>
      verifyAssistantAction(`${payload}changed.${signature}`, secret, now + 1000)
    ).toThrow(/changed|invalid/i);
    expect(() => verifyAssistantAction(token, secret, now + 16 * 60 * 1000)).toThrow(
      /expired/i
    );
  });
});
