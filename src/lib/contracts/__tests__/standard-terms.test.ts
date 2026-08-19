import { describe, expect, it } from "vitest";
import {
  dollarsToWords,
  STANDARD_SINGLE_FAMILY_PRICE,
  hasUnmergedFields,
  longDate,
  mergeContractTemplate,
  MERGE_FIELD_KEYS,
  SINGLE_FAMILY_BODY,
  MULTIFAMILY_BODY,
  type ContractMergeFields,
} from "../standard-terms";

const FIELDS: ContractMergeFields = {
  owner_name: "Habitat for Humanity — CSRA, Inc.",
  owner_entity_description: "a Georgia nonprofit corporation",
  property_address: "608 Macon Avenue, Augusta, Richmond County, Georgia 30901",
  county: "Richmond",
  project_name: "608 Macon Avenue Residence",
  contract_price: "$239,665",
  contract_price_words: dollarsToWords(239665),
  effective_date: "Monday, July 13, 2026",
  plans_description:
    "the Booker + Vick Architects permit set, Job No. 2615, dated May 21, 2026",
  scope_description: "The Work includes the full scope shown in the plans.",
  owner_signatory: "Bernadette Kelliher, CEO",
  contractor_signatory: "Troy W. Akers, Managing Principal",
};

describe("dollarsToWords", () => {
  it("writes the 608 Macon price the way the signed contract does", () => {
    expect(dollarsToWords(239665)).toBe(
      "Two Hundred Thirty-Nine Thousand Six Hundred Sixty-Five and 00/100 Dollars"
    );
  });

  it("the standard single-family price is the signed 608 Macon amount", () => {
    expect(STANDARD_SINGLE_FAMILY_PRICE).toBe(239665);
    expect(dollarsToWords(STANDARD_SINGLE_FAMILY_PRICE)).toBe(
      "Two Hundred Thirty-Nine Thousand Six Hundred Sixty-Five and 00/100 Dollars"
    );
  });

  it("handles round and small amounts", () => {
    expect(dollarsToWords(1_000_000)).toBe("One Million and 00/100 Dollars");
    expect(dollarsToWords(15)).toBe("Fifteen and 00/100 Dollars");
    expect(dollarsToWords(0)).toBe("Zero and 00/100 Dollars");
    expect(dollarsToWords(21)).toBe("Twenty-One and 00/100 Dollars");
  });

  it("carries cents", () => {
    expect(dollarsToWords(1250.5)).toBe(
      "One Thousand Two Hundred Fifty and 50/100 Dollars"
    );
    expect(dollarsToWords(0.07)).toBe("Zero and 07/100 Dollars");
  });

  it("spans scales without dropping words", () => {
    expect(dollarsToWords(1_234_567)).toBe(
      "One Million Two Hundred Thirty-Four Thousand Five Hundred Sixty-Seven and 00/100 Dollars"
    );
  });

  it("rejects out-of-range amounts", () => {
    expect(() => dollarsToWords(-1)).toThrow();
    expect(() => dollarsToWords(Number.NaN)).toThrow();
  });
});

describe("longDate", () => {
  it("writes dates the way the contract header does", () => {
    expect(longDate("2026-07-13")).toBe("Monday, July 13, 2026");
  });
});

describe("templates and merge", () => {
  it("every merge field in both templates is a known field", () => {
    for (const body of [SINGLE_FAMILY_BODY, MULTIFAMILY_BODY]) {
      const tokens = [...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      expect(tokens.length).toBeGreaterThan(0);
      for (const t of tokens) {
        expect(MERGE_FIELD_KEYS).toContain(t);
      }
    }
  });

  it("a full merge leaves no unfilled tokens", () => {
    for (const body of [SINGLE_FAMILY_BODY, MULTIFAMILY_BODY]) {
      const merged = mergeContractTemplate(body, FIELDS);
      expect(hasUnmergedFields(merged)).toBe(false);
      expect(merged).toContain("$239,665");
      expect(merged).toContain(
        "Two Hundred Thirty-Nine Thousand Six Hundred Sixty-Five and 00/100 Dollars"
      );
      expect(merged).toContain("Habitat for Humanity — CSRA, Inc.");
    }
  });

  it("an empty field stays visible instead of vanishing", () => {
    const merged = mergeContractTemplate(SINGLE_FAMILY_BODY, {
      ...FIELDS,
      owner_signatory: "",
    });
    expect(merged).toContain("{{owner_signatory}}");
    expect(hasUnmergedFields(merged)).toBe(true);
  });

  it("keeps the statutory lien waiver notice intact after merge", () => {
    const merged = mergeContractTemplate(SINGLE_FAMILY_BODY, FIELDS);
    expect(merged).toContain("AFFIDAVIT OF NONPAYMENT");
    expect(merged).toContain("O.C.G.A. § 44-14-366");
  });
});
