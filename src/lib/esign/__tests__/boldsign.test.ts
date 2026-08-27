import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BoldSignApiError,
  sendDocumentForSignature,
  verifyWebhookSignature,
} from "@/lib/esign/boldsign";
import { splitBodyForEsign } from "@/lib/esign/contract-esign-pdf";

const SECRET = "whsec_test";

function sign(rawBody: string, timestamp: number, secret = SECRET) {
  const s0 = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},s0=${s0}`;
}

describe("verifyWebhookSignature", () => {
  const now = 1_700_000_000;
  const body = '{"event":{"eventType":"Completed"}}';

  it("accepts a fresh, correctly signed payload", () => {
    expect(verifyWebhookSignature(body, sign(body, now), SECRET, 300, now)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    expect(
      verifyWebhookSignature(body + " ", sign(body, now), SECRET, 300, now)
    ).toBe(false);
  });

  it("rejects the wrong secret", () => {
    expect(
      verifyWebhookSignature(body, sign(body, now, "other"), SECRET, 300, now)
    ).toBe(false);
  });

  it("rejects a stale timestamp", () => {
    expect(
      verifyWebhookSignature(body, sign(body, now - 3600), SECRET, 300, now)
    ).toBe(false);
  });

  it("fails closed with no secret configured or no header", () => {
    expect(verifyWebhookSignature(body, sign(body, now), undefined, 300, now)).toBe(false);
    expect(verifyWebhookSignature(body, null, SECRET, 300, now)).toBe(false);
  });
});

describe("sendDocumentForSignature", () => {
  beforeEach(() => {
    process.env.BOLDSIGN_API_KEY = "test-key";
  });
  afterEach(() => {
    delete process.env.BOLDSIGN_API_KEY;
    vi.restoreAllMocks();
  });

  it("flattens signers and fields into BoldSign's bracketed form keys", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ documentId: "doc-123" }), { status: 200 })
      );

    const result = await sendDocumentForSignature({
      title: "Agreement",
      message: "Please sign",
      fileName: "agreement.pdf",
      pdf: Buffer.from("%PDF-1.4 test"),
      signers: [
        {
          name: "Troy W. Akers",
          email: "troy@example.com",
          order: 1,
          fields: [
            {
              id: "contractor_signature",
              fieldType: "Signature",
              pageNumber: 5,
              bounds: { x: 48, y: 250, width: 230, height: 44 },
            },
          ],
        },
      ],
    });
    expect(result.documentId).toBe("doc-123");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.boldsign.com/v1/document/send");
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-API-KEY"]).toBe("test-key");
    const form = init?.body as FormData;
    expect(form.get("Signers[0][name]")).toBe("Troy W. Akers");
    expect(form.get("Signers[0][emailAddress]")).toBe("troy@example.com");
    expect(form.get("Signers[0][formFields][0][fieldType]")).toBe("Signature");
    expect(form.get("Signers[0][formFields][0][pageNumber]")).toBe("5");
    expect(form.get("Signers[0][formFields][0][bounds][x]")).toBe("48");
    expect(form.get("Files")).toBeInstanceOf(Blob);
  });

  it("throws a typed error on a non-2xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", { status: 401 })
    );
    await expect(
      sendDocumentForSignature({
        title: "t",
        message: "m",
        fileName: "f.pdf",
        pdf: Buffer.from("x"),
        signers: [],
      })
    ).rejects.toBeInstanceOf(BoldSignApiError);
  });

  it("refuses to run without an API key", async () => {
    delete process.env.BOLDSIGN_API_KEY;
    await expect(
      sendDocumentForSignature({
        title: "t",
        message: "m",
        fileName: "f.pdf",
        pdf: Buffer.from("x"),
        signers: [],
      })
    ).rejects.toThrow(/BOLDSIGN_API_KEY/);
  });
});

describe("splitBodyForEsign", () => {
  const body = [
    "# Residential Construction Agreement",
    "Fixed-Price Build · Single-Family Residence",
    "## 1. Scope of Work",
    "1.1 Contractor shall do the Work.",
    "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.",
    "**CONTRACTOR** — 8th Street Construction LLC",
    "By: Troy W. Akers, Managing Principal",
    "Date: ____________________",
    "**OWNER** — Habitat for Humanity — CSRA, Inc.",
    "By: Bernadette M. Kelliher, President & CEO",
    "Date: ____________________",
    "---",
    "## Exhibit A — Scope of Work and Plans",
    "New single-family residence.",
  ].join("\n\n");

  it("lifts the inline signature section out and keeps the halves", () => {
    const split = splitBodyForEsign(body);
    expect(split.before.at(-1)).toBe("1.1 Contractor shall do the Work.");
    expect(split.after[0]).toBe("## Exhibit A — Scope of Work and Plans");
    expect(split.witnessText).toMatch(/^IN WITNESS WHEREOF/);
    expect(split.contractor.heading).toBe("CONTRACTOR — 8th Street Construction LLC");
    expect(split.contractor.signatory).toBe("Troy W. Akers, Managing Principal");
    expect(split.owner.heading).toBe("OWNER — Habitat for Humanity — CSRA, Inc.");
    expect(split.owner.signatory).toBe("Bernadette M. Kelliher, President & CEO");
  });

  it("keeps everything and falls back to defaults when no witness block exists", () => {
    const split = splitBodyForEsign("## 1. Scope\n\nAll of it.");
    expect(split.before).toHaveLength(2);
    expect(split.after).toHaveLength(0);
    expect(split.contractor.signatory).toMatch(/Troy W\. Akers/);
  });
});
