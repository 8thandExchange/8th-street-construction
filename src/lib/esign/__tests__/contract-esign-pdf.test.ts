import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  EXECUTION_FIELDS,
  renderContractEsignPdf,
} from "@/lib/esign/contract-esign-pdf";

/**
 * Real render, no mocks: the send action trusts executionPageNumber to
 * position BoldSign fields, so this proves the merged PDF actually has the
 * execution page where the renderer says it is.
 */

const section = (n: number) =>
  `## ${n}. Section ${n}\n\n` +
  `${n}.1 ${"The Parties agree to the terms of this section as written. ".repeat(12)}`;

const BODY = [
  "# Residential Construction Agreement",
  "Fixed-Price Build · Single-Family Residence",
  "**Project** 1137 Merry Street, Augusta, Richmond County, Georgia 30904",
  "**Contract Price** $238,542 (Two Hundred Thirty-Eight Thousand Five Hundred Forty-Two and 00/100 Dollars)",
  "---",
  ...Array.from({ length: 10 }, (_, i) => section(i + 1)),
  "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.",
  "**CONTRACTOR** — 8th Street Construction LLC",
  "By: Troy W. Akers, Managing Principal",
  "Date: ____________________",
  "**OWNER** — Habitat for Humanity — CSRA, Inc.",
  "By: Bernadette M. Kelliher, President & CEO",
  "Date: ____________________",
  "---",
  "## Exhibit A — Scope of Work and Plans",
  "New single-family residence constructed per the plan set.",
].join("\n\n");

describe("renderContractEsignPdf", () => {
  it("renders body + execution page + exhibits with a truthful page number", async () => {
    const { pdf, executionPageNumber } = await renderContractEsignPdf({
      bodyMd: BODY,
      footerLabel: "Residential Construction Agreement — 1137 Merry Street",
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");

    const doc = await PDFDocument.load(pdf);
    // Body flows over at least two pages, then execution, then exhibits.
    expect(executionPageNumber).toBeGreaterThan(1);
    expect(doc.getPageCount()).toBeGreaterThan(executionPageNumber);

    // The execution page is letter-size — the space the field bounds assume.
    const page = doc.getPage(executionPageNumber - 1);
    expect(Math.round(page.getWidth())).toBe(612);
    expect(Math.round(page.getHeight())).toBe(792);

    // Field boxes stay inside the page.
    for (const bounds of Object.values(EXECUTION_FIELDS)) {
      expect(bounds.x + bounds.width).toBeLessThan(612);
      expect(bounds.y + bounds.height).toBeLessThan(792);
    }
  }, 30_000);
});
