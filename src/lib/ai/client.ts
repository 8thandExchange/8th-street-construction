import Anthropic from "@anthropic-ai/sdk";
import { anthropicConfigured, anthropicModel } from "./config";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI is not configured. Add ANTHROPIC_API_KEY in your environment.");
    this.name = "AiNotConfiguredError";
  }
}

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicConfigured()) throw new AiNotConfiguredError();
  if (!cached) {
    cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim() });
  }
  return cached;
}

type GenerateOptions = {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  /** Public image URLs to include for vision (e.g. jobsite photos). */
  images?: string[];
};

function buildUserContent(prompt: string, images?: string[]): Anthropic.MessageParam["content"] {
  if (!images?.length) return prompt;
  const blocks: Anthropic.ContentBlockParam[] = images.slice(0, 8).map((url) => ({
    type: "image",
    source: { type: "url", url },
  }));
  blocks.push({ type: "text", text: prompt });
  return blocks;
}

/** Single-turn text generation against Claude. Returns plain text. */
export async function generateText({
  system,
  prompt,
  maxTokens = 1024,
  temperature = 0.5,
  images,
}: GenerateOptions): Promise<string> {
  const client = getClient();
  const message = await client.messages.create({
    model: anthropicModel(),
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: "user", content: buildUserContent(prompt, images) }],
  });

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * Generate JSON matching a shape. Instructs Claude to return only JSON and
 * parses defensively (strips markdown fences if present).
 */
export async function generateJson<T>({
  system,
  prompt,
  maxTokens = 1024,
  temperature = 0.4,
  images,
}: GenerateOptions): Promise<T> {
  const raw = await generateText({
    system: `${system}\n\nRespond with ONLY valid JSON. No markdown, no commentary.`,
    prompt,
    maxTokens,
    temperature,
    images,
  });

  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  return JSON.parse(cleaned) as T;
}
