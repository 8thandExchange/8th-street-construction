/**
 * Magic-byte checks for uploaded files. The browser-supplied `file.type` is
 * attacker-controlled; these verify the bytes actually start like the format
 * they claim before we store or later parse them.
 */

const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  "application/pdf": (b) =>
    b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // %PDF
  "image/png": (b) =>
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a,
  "image/jpeg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) =>
    b.length >= 12 &&
    b[0] === 0x52 && // RIFF
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 && // WEBP
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50,
  "image/heic": (b) => {
    // ISO-BMFF: size (4) + "ftyp" + brand. Covers heic/heif/heix variants.
    if (b.length < 12) return false;
    if (b[4] !== 0x66 || b[5] !== 0x74 || b[6] !== 0x79 || b[7] !== 0x70) return false;
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    return brand.startsWith("he") || brand.startsWith("mif") || brand.startsWith("msf");
  },
};

// Formats that share a signature check.
SIGNATURES["image/jpg"] = SIGNATURES["image/jpeg"];
SIGNATURES["image/heif"] = SIGNATURES["image/heic"];

/**
 * True when the bytes plausibly match the claimed media type. Types we have no
 * signature for pass through — the caller's allowlist has already narrowed
 * what's acceptable; this only catches lies about the types we do know.
 */
export function bytesMatchClaimedType(bytes: Uint8Array, claimedType: string): boolean {
  const check = SIGNATURES[claimedType.toLowerCase()];
  return check ? check(bytes) : true;
}
