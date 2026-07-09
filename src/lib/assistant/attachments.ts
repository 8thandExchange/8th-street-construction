import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Chat attachments for the admin assistant. Files are staged in the
 * project-documents bucket under assistant-inbox/ by the upload route;
 * the chat history carries only a lightweight {type:"attachment"} ref.
 * On every request the route resolves those refs into real Claude
 * document/image blocks (base64) so the model can read the file, plus a
 * text marker carrying the staged storage_path for the file_document tool.
 */

export const ATTACHMENT_BUCKET = "project-documents";
export const STAGING_PREFIX = "assistant-inbox/";
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // keeps base64 well under the API request cap

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const ALLOWED_ATTACHMENT_TYPES = ["application/pdf", ...IMAGE_TYPES];

export type AttachmentRef = {
  type: "attachment";
  storage_path: string;
  file_name: string;
  media_type: string;
  file_size: number;
};

function isAttachmentRef(block: unknown): block is AttachmentRef {
  return (
    typeof block === "object" &&
    block !== null &&
    (block as Record<string, unknown>).type === "attachment" &&
    typeof (block as Record<string, unknown>).storage_path === "string"
  );
}

async function toContentBlocks(ref: AttachmentRef): Promise<Anthropic.ContentBlockParam[]> {
  const marker: Anthropic.TextBlockParam = {
    type: "text",
    text: `[Attached file "${ref.file_name}" — staged at storage_path: ${ref.storage_path}]`,
  };

  // Only files staged by the upload route are resolvable.
  if (!ref.storage_path.startsWith(STAGING_PREFIX) || ref.storage_path.includes("..")) {
    return [{ type: "text", text: `[Attachment "${ref.file_name}" has an invalid path and could not be read.]` }];
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(ATTACHMENT_BUCKET).download(ref.storage_path);
  if (error || !data) {
    return [
      {
        type: "text",
        text: `[Attachment "${ref.file_name}" could not be read from storage — tell the admin the upload may have failed and ask them to re-attach it.]`,
      },
    ];
  }

  const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");

  if (ref.media_type === "application/pdf") {
    return [
      marker,
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
        title: ref.file_name,
      },
    ];
  }

  if ((IMAGE_TYPES as readonly string[]).includes(ref.media_type)) {
    return [
      marker,
      {
        type: "image",
        source: {
          type: "base64",
          media_type: ref.media_type as (typeof IMAGE_TYPES)[number],
          data: base64,
        },
      },
    ];
  }

  return [{ type: "text", text: `[Attachment "${ref.file_name}" has unsupported type ${ref.media_type}.]` }];
}

/**
 * Replace attachment refs in the incoming history with real Claude
 * content blocks. Messages without attachments pass through untouched.
 */
export async function resolveAttachments(
  messages: Anthropic.MessageParam[]
): Promise<Anthropic.MessageParam[]> {
  return Promise.all(
    messages.map(async (message) => {
      if (!Array.isArray(message.content)) return message;
      if (!message.content.some(isAttachmentRef)) return message;

      const blocks: Anthropic.ContentBlockParam[] = [];
      for (const block of message.content) {
        if (isAttachmentRef(block)) {
          blocks.push(...(await toContentBlocks(block)));
        } else {
          blocks.push(block as Anthropic.ContentBlockParam);
        }
      }
      return { ...message, content: blocks };
    })
  );
}
