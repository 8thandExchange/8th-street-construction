import { createHmac, timingSafeEqual } from "node:crypto";

export type SignedAssistantAction = {
  toolUseId: string;
  name: string;
  input: unknown;
  expiresAt: number;
};

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signAssistantAction(
  action: Omit<SignedAssistantAction, "expiresAt">,
  secret: string,
  now = Date.now()
): string {
  if (!secret) throw new Error("Assistant confirmation signing is not configured");
  const payload = encode(
    JSON.stringify({
      ...action,
      expiresAt: now + 15 * 60 * 1000,
    } satisfies SignedAssistantAction)
  );
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyAssistantAction(
  token: string,
  secret: string,
  now = Date.now()
): SignedAssistantAction {
  if (!secret) throw new Error("Assistant confirmation signing is not configured");
  const [payload, provided] = token.split(".");
  if (!payload || !provided) throw new Error("Invalid approval token");

  const expected = signature(payload, secret);
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (
    expectedBytes.length !== providedBytes.length ||
    !timingSafeEqual(expectedBytes, providedBytes)
  ) {
    throw new Error("Approval details changed. Please ask the assistant to prepare it again.");
  }

  let action: SignedAssistantAction;
  try {
    action = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid approval token");
  }
  if (
    !action ||
    typeof action.toolUseId !== "string" ||
    typeof action.name !== "string" ||
    typeof action.expiresAt !== "number"
  ) {
    throw new Error("Invalid approval token");
  }
  if (action.expiresAt < now) {
    throw new Error("This approval expired. Please ask the assistant to prepare it again.");
  }
  return action;
}
