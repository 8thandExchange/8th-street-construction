import { describe, expect, it } from "vitest";
import { transactionMatchesBill, type MercuryTxn, type OpenBill } from "../vendor-sync";

/** The real 2026-08-05 MonteCristo payment, verbatim from the Mercury API. */
const MC_001_TXN: MercuryTxn = {
  id: "e58c9100-9127-11f1-9123-0fcedf1b963e",
  amount: -20208,
  status: "sent",
  postedAt: "2026-08-05T23:46:38.123522Z",
  externalMemo: "From 8th Street Construction LLC via mercury.com for invoice MC-001",
  bankDescription: "Send Money transaction initiated on Mercury",
  counterpartyName: "Monte Cristo MonteCristo Consultants, LLC",
};

/** amount arrives as a string — Postgres numeric comes back quoted. */
const MC_001_BILL: OpenBill = {
  id: "8f9bb39e-8a54-43e3-b999-c9001ed688c4",
  vendor_id: "c28a48aa-e13f-44c8-990d-94fda5e6b4fb",
  bill_number: "MC-001",
  amount: "20208.00",
  vendorName: "MonteCristo Consultants, LLC",
};

describe("transactionMatchesBill", () => {
  it("matches the payment that went unreconciled on 2026-08-05", () => {
    expect(transactionMatchesBill(MC_001_TXN, MC_001_BILL)).toBe(true);
  });

  it("matches on vendor name when the bill has no number", () => {
    expect(
      transactionMatchesBill(MC_001_TXN, { ...MC_001_BILL, bill_number: null })
    ).toBe(true);
  });

  it("matches a pending send, so the double-pay guard arms before settlement", () => {
    expect(
      transactionMatchesBill({ ...MC_001_TXN, status: "pending", postedAt: null }, MC_001_BILL)
    ).toBe(true);
  });

  it("ignores money coming in", () => {
    expect(transactionMatchesBill({ ...MC_001_TXN, amount: 20208 }, MC_001_BILL)).toBe(false);
  });

  it("ignores cancelled and failed sends", () => {
    for (const status of ["cancelled", "failed", "reversed"]) {
      expect(transactionMatchesBill({ ...MC_001_TXN, status }, MC_001_BILL)).toBe(false);
    }
  });

  it("rejects an amount that is off by a cent", () => {
    expect(transactionMatchesBill({ ...MC_001_TXN, amount: -20208.01 }, MC_001_BILL)).toBe(
      false
    );
  });

  it("refuses to match on amount alone", () => {
    // Same money, unrelated vendor: nothing in the transaction names this bill.
    const unrelated: OpenBill = {
      id: "0f0e0d0c-0b0a-4909-8807-060504030201",
      vendor_id: "11111111-2222-4333-8444-555555555555",
      bill_number: "TC-114",
      amount: 20208,
      vendorName: "Thompsons Clearing",
    };
    expect(transactionMatchesBill(MC_001_TXN, unrelated)).toBe(false);
  });

  it("does not let a very short vendor name match by accident", () => {
    // "M&M" normalizes to "mm", which appears inside "...transaction initiated
    // on Mercury". Too short to be evidence of anything.
    const shortName: OpenBill = {
      id: "22222222-3333-4444-8555-666666666666",
      vendor_id: "77777777-8888-4999-8aaa-bbbbbbbbbbbb",
      bill_number: null,
      amount: 20208,
      vendorName: "M&M",
    };
    expect(transactionMatchesBill(MC_001_TXN, shortName)).toBe(false);
  });

  it("tolerates punctuation and case drift between Mercury and the vendor record", () => {
    expect(
      transactionMatchesBill(
        { ...MC_001_TXN, externalMemo: "payment ref mc001", counterpartyName: null },
        MC_001_BILL
      )
    ).toBe(true);
  });
});
