import { describe, expect, it } from "vitest";
import { bytesMatchClaimedType } from "./sniff";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const HTML = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e]); // "<html>"

describe("bytesMatchClaimedType", () => {
  it("accepts real signatures under their own type", () => {
    expect(bytesMatchClaimedType(PDF, "application/pdf")).toBe(true);
    expect(bytesMatchClaimedType(PNG, "image/png")).toBe(true);
    expect(bytesMatchClaimedType(JPEG, "image/jpeg")).toBe(true);
    expect(bytesMatchClaimedType(JPEG, "image/jpg")).toBe(true);
    expect(bytesMatchClaimedType(WEBP, "image/webp")).toBe(true);
  });

  it("rejects content that lies about its type", () => {
    expect(bytesMatchClaimedType(HTML, "application/pdf")).toBe(false);
    expect(bytesMatchClaimedType(HTML, "image/png")).toBe(false);
    expect(bytesMatchClaimedType(PDF, "image/jpeg")).toBe(false);
    expect(bytesMatchClaimedType(PNG, "application/pdf")).toBe(false);
  });

  it("rejects truncated files shorter than their signature", () => {
    expect(bytesMatchClaimedType(new Uint8Array([0x25, 0x50]), "application/pdf")).toBe(false);
    expect(bytesMatchClaimedType(new Uint8Array(0), "image/png")).toBe(false);
  });

  it("passes through types it has no signature for", () => {
    expect(bytesMatchClaimedType(HTML, "image/gif")).toBe(true);
  });

  it("is case-insensitive about the claimed type", () => {
    expect(bytesMatchClaimedType(PDF, "Application/PDF")).toBe(true);
  });
});
