import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * BoldSign REST client — the pieces the contract workflow needs and no
 * more: send a document for signature, download the executed PDF, and
 * verify webhook signatures. The API key is server-only; nothing here may
 * be imported from a client component.
 *
 * BoldSign positions form fields by page + bounds (points from the page's
 * top-left, letter = 612x792). We render the contract PDF ourselves with a
 * fixed-layout execution page, so those coordinates are deterministic —
 * see contract-esign-pdf.tsx, which owns them.
 */

const BOLDSIGN_API_BASE = "https://api.boldsign.com";
const REQUEST_TIMEOUT_MS = 30_000;

export class BoldSignApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string
  ) {
    super(message);
    this.name = "BoldSignApiError";
  }
}

function apiKey(): string {
  const key = process.env.BOLDSIGN_API_KEY;
  if (!key) {
    throw new BoldSignApiError(
      "BOLDSIGN_API_KEY is not configured — add it to the environment to send documents for signature",
      0
    );
  }
  return key;
}

export type EsignFieldBounds = { x: number; y: number; width: number; height: number };

export type EsignSigner = {
  name: string;
  email: string;
  /** 1-based signing order; both signers get order 1 = sign in parallel. */
  order: number;
  fields: Array<{
    id: string;
    fieldType: "Signature" | "DateSigned";
    pageNumber: number;
    bounds: EsignFieldBounds;
  }>;
};

export type SendDocumentInput = {
  title: string;
  message: string;
  fileName: string;
  pdf: Buffer;
  signers: EsignSigner[];
};

/**
 * POST /v1/document/send. BoldSign takes multipart form data with the
 * signer tree flattened into bracketed keys, exactly as their REST
 * examples do. Returns the provider's document id — our envelope id.
 */
export async function sendDocumentForSignature(
  input: SendDocumentInput
): Promise<{ documentId: string }> {
  const form = new FormData();
  form.append("Title", input.title);
  form.append("Message", input.message);
  form.append(
    "Files",
    new Blob([new Uint8Array(input.pdf)], { type: "application/pdf" }),
    input.fileName
  );

  for (const [s, signer] of input.signers.entries()) {
    form.append(`Signers[${s}][name]`, signer.name);
    form.append(`Signers[${s}][emailAddress]`, signer.email);
    form.append(`Signers[${s}][signerOrder]`, String(signer.order));
    form.append(`Signers[${s}][signerType]`, "Signer");
    for (const [f, field] of signer.fields.entries()) {
      const prefix = `Signers[${s}][formFields][${f}]`;
      form.append(`${prefix}[id]`, field.id);
      form.append(`${prefix}[fieldType]`, field.fieldType);
      form.append(`${prefix}[pageNumber]`, String(field.pageNumber));
      form.append(`${prefix}[isRequired]`, "true");
      form.append(`${prefix}[bounds][x]`, String(field.bounds.x));
      form.append(`${prefix}[bounds][y]`, String(field.bounds.y));
      form.append(`${prefix}[bounds][width]`, String(field.bounds.width));
      form.append(`${prefix}[bounds][height]`, String(field.bounds.height));
    }
  }

  const response = await fetch(`${BOLDSIGN_API_BASE}/v1/document/send`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey() },
    body: form,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new BoldSignApiError(
      `BoldSign send failed (${response.status})`,
      response.status,
      text
    );
  }
  const parsed = JSON.parse(text) as { documentId?: string };
  if (!parsed.documentId) {
    throw new BoldSignApiError("BoldSign send returned no documentId", response.status, text);
  }
  return { documentId: parsed.documentId };
}

/** GET /v1/document/download — the executed PDF once everyone has signed. */
export async function downloadSignedDocument(documentId: string): Promise<Buffer> {
  const response = await fetch(
    `${BOLDSIGN_API_BASE}/v1/document/download?documentId=${encodeURIComponent(documentId)}`,
    {
      headers: { "X-API-KEY": apiKey() },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );
  if (!response.ok) {
    throw new BoldSignApiError(
      `BoldSign download failed (${response.status})`,
      response.status,
      await response.text()
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * BoldSign signs webhook deliveries Stripe-style: the X-BoldSign-Signature
 * header carries `t=<unix seconds>,s0=<hex hmac>` where the HMAC-SHA256 is
 * computed over `${t}.${rawBody}` with the webhook secret. Fails closed on
 * a missing secret, malformed header, stale timestamp, or mismatch.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!secret || !signatureHeader) return false;

  const parts = new Map(
    signatureHeader.split(",").map((piece) => {
      const eq = piece.indexOf("=");
      return [piece.slice(0, eq).trim(), piece.slice(eq + 1).trim()] as const;
    })
  );
  const timestamp = parts.get("t");
  const signature = parts.get("s0");
  if (!timestamp || !signature) return false;

  const age = Math.abs(nowSeconds - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
