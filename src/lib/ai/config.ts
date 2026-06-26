export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-latest";

export function anthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function anthropicModel() {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

/** Shared brand voice so every AI surface sounds like 8th Street. */
export const BRAND_VOICE = `You write for 8th Street Construction, a high-end residential and commercial builder in Augusta, Georgia (a division of 8th and Exchange Capital).
Voice: warm, confident, precise, and human. Never salesy or robotic. Short, clear sentences.
Audience for client-facing copy: homeowners or Habitat for Humanity partners who are not builders — avoid heavy jargon, explain plainly.
Never invent facts, dates, or figures that are not in the provided context.`;
