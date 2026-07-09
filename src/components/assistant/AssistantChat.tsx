"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Banknote,
  CircleCheck,
  CircleX,
  Download,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Raw Anthropic message param, kept opaque — we round-trip it to the API verbatim. */
type HistoryMessage = { role: "user" | "assistant"; content: unknown };

type PendingConfirmation = {
  tool_use_id: string;
  name: string;
  input: Record<string, unknown>;
  summary: string;
};

/** A file staged in storage by /api/assistant/upload, awaiting send. */
type StagedAttachment = {
  storage_path: string;
  file_name: string;
  media_type: string;
  file_size: number;
};

type DisplayItem =
  | { kind: "user"; text: string; files?: string[] }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; name: string; status: "running" | "done" | "error" }
  | { kind: "download"; url: string; fileName: string }
  | { kind: "confirm"; confirmation: PendingConfirmation; resolved?: "approved" | "declined" }
  | { kind: "error"; text: string };

const TOOL_LABELS: Record<string, string> = {
  list_projects: "Looking up projects",
  find_people: "Searching people",
  get_project_billing: "Pulling billing details",
  list_invoices: "Looking up invoices",
  list_purchase_orders: "Looking up purchase orders",
  list_recent_leads: "Fetching leads",
  company_snapshot: "Running the numbers",
  create_invoice: "Creating invoice",
  send_invoice: "Sending invoice",
  mark_invoice_paid: "Marking invoice paid",
  get_project_schedule: "Reading the schedule",
  update_milestone: "Updating the schedule",
  send_client_message: "Drafting client message",
  create_portal_user: "Setting up portal login",
  file_document: "Filing document",
  get_schedule_pdf: "Preparing schedule PDF",
  // Client concierge tools
  get_schedule: "Reading your schedule",
  get_recent_updates: "Checking recent updates",
  get_billing_summary: "Pulling your billing summary",
  get_documents: "Listing your documents",
  get_messages: "Reading the message thread",
  send_message_to_team: "Drafting a message to the team",
};

const SUGGESTIONS = [
  "Where are we on 608 Macon — are we on schedule?",
  "Message Habitat that the slab pours Friday and framing starts the week after",
  "Send an invoice to Habitat for $12,500 for the framing draw",
  "Flag exterior paint as a volunteer stage — note that Habitat crews are welcome",
];

export type AssistantChatConfig = {
  /** API route the chat talks to (default: the admin assistant) */
  endpoint?: string;
  suggestions?: string[];
  emptyTitle?: string;
  emptyBody?: string;
  placeholder?: string;
  footnote?: string;
  /** Allow attaching PDFs/images (requires an `${endpoint}/upload` route). */
  allowAttachments?: boolean;
};

const ACCEPTED_FILE_TYPES = ".pdf,image/png,image/jpeg,image/webp,image/gif";

/** Minimal Web Speech API surface (Chrome/Edge/Safari; absent elsewhere). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

export function AssistantChat({
  initialPrompt,
  config,
}: {
  initialPrompt?: string;
  config?: AssistantChatConfig;
}) {
  const endpoint = config?.endpoint ?? "/api/assistant";
  const suggestions = config?.suggestions ?? SUGGESTIONS;
  const emptyTitle = config?.emptyTitle ?? "What needs doing?";
  const emptyBody =
    config?.emptyBody ??
    "Invoicing, schedules, client messages, leads — type it or tap the mic and say it. Attach an invoice or document (paperclip) and I'll read it and file it to the right job. Anything that moves money or reaches a client waits for your approval first.";
  const placeholder = config?.placeholder ?? 'Try: "send an invoice to Habitat for $12,500"';
  const footnote =
    config?.footnote ?? "Money actions and client messages require your approval before anything sends.";
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HistoryMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSent = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const dictationBase = useRef("");
  historyRef.current = history;
  const allowAttachments = Boolean(config?.allowAttachments);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!allowAttachments || files.length === 0) return;
      setUploading(true);
      try {
        for (const file of files) {
          const form = new FormData();
          form.set("file", file);
          const res = await fetch(`${endpoint}/upload`, { method: "POST", body: form });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.storage_path) {
            setItems((prev) => [
              ...prev,
              { kind: "error", text: data?.error ?? `Could not attach ${file.name}` },
            ]);
            continue;
          }
          setAttachments((prev) => [...prev, data as StagedAttachment]);
        }
      } finally {
        setUploading(false);
      }
    },
    [allowAttachments, endpoint]
  );

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognition()));
  }, []);

  const toggleDictation = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const rec = new Recognition();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    dictationBase.current = input ? input.replace(/\s+$/, "") + " " : "";
    rec.onresult = (event) => {
      let transcript = "";
      for (let r = 0; r < event.results.length; r++) {
        transcript += event.results[r][0]?.transcript ?? "";
      }
      setInput(dictationBase.current + transcript.trimStart());
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    rec.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }, [listening, input]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  const streamTurn = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => null);
          setItems((prev) => [
            ...prev,
            { kind: "error", text: err?.error ?? `Request failed (${res.status})` },
          ]);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantOpen = false;

        const handleEvent = (event: Record<string, unknown>) => {
          switch (event.type) {
            case "text": {
              const text = String(event.text ?? "");
              setItems((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (assistantOpen && last?.kind === "assistant") {
                  next[next.length - 1] = { kind: "assistant", text: last.text + text };
                } else {
                  next.push({ kind: "assistant", text });
                }
                return next;
              });
              assistantOpen = true;
              break;
            }
            case "tool_start": {
              assistantOpen = false;
              const name = String(event.name ?? "");
              setItems((prev) => [...prev, { kind: "tool", name, status: "running" }]);
              break;
            }
            case "tool_end": {
              const name = String(event.name ?? "");
              const isError = Boolean(event.is_error);
              const download = event.download as { url?: string; file_name?: string } | undefined;
              setItems((prev) => {
                const next = [...prev];
                for (let idx = next.length - 1; idx >= 0; idx--) {
                  const item = next[idx];
                  if (item.kind === "tool" && item.name === name && item.status === "running") {
                    next[idx] = { kind: "tool", name, status: isError ? "error" : "done" };
                    break;
                  }
                }
                if (!isError && download?.url) {
                  next.push({
                    kind: "download",
                    url: download.url,
                    fileName: download.file_name ?? "download.pdf",
                  });
                }
                return next;
              });
              break;
            }
            case "history": {
              setHistory((prev) => [...prev, event.message as HistoryMessage]);
              break;
            }
            case "confirm_required": {
              assistantOpen = false;
              const confirmation: PendingConfirmation = {
                tool_use_id: String(event.tool_use_id),
                name: String(event.name),
                input: (event.input ?? {}) as Record<string, unknown>,
                summary: String(event.summary ?? ""),
              };
              setPending(confirmation);
              setItems((prev) => [...prev, { kind: "confirm", confirmation }]);
              break;
            }
            case "error": {
              assistantOpen = false;
              setItems((prev) => [...prev, { kind: "error", text: String(event.message ?? "") }]);
              break;
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              handleEvent(JSON.parse(line));
            } catch {
              // skip malformed line
            }
          }
        }
      } catch {
        setItems((prev) => [
          ...prev,
          { kind: "error", text: "Connection lost — try again." },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [endpoint]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      const files = attachments;
      if ((!trimmed && files.length === 0) || busy || pending || uploading) return;
      setInput("");
      setAttachments([]);
      setItems((prev) => [
        ...prev,
        {
          kind: "user",
          text: trimmed,
          files: files.length ? files.map((f) => f.file_name) : undefined,
        },
      ]);
      // Attachments ride along as lightweight refs; the server swaps them
      // for real document/image blocks on every request.
      const content: unknown = files.length
        ? [
            ...files.map((f) => ({ type: "attachment", ...f })),
            ...(trimmed ? [{ type: "text", text: trimmed }] : []),
          ]
        : trimmed;
      const userMessage: HistoryMessage = { role: "user", content };
      const messages = [...historyRef.current, userMessage];
      setHistory(messages);
      await streamTurn({ messages });
    },
    [busy, pending, uploading, attachments, streamTurn]
  );

  // Query handed off from the command palette (?q=) — send it once on mount.
  useEffect(() => {
    if (initialPrompt && !autoSent.current) {
      autoSent.current = true;
      sendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const resolveConfirmation = useCallback(
    async (approved: boolean) => {
      if (!pending || busy) return;
      const confirmation = pending;
      setPending(null);
      setItems((prev) =>
        prev.map((item) =>
          item.kind === "confirm" &&
          item.confirmation.tool_use_id === confirmation.tool_use_id
            ? { ...item, resolved: approved ? "approved" : "declined" }
            : item
        )
      );
      await streamTurn({
        messages: historyRef.current,
        confirm: { tool_use_id: confirmation.tool_use_id, approved },
      });
    },
    [pending, busy, streamTurn]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-1 py-4">
        {items.length === 0 && (
          <div className="mx-auto max-w-xl pt-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy text-copper">
              <Sparkles size={20} strokeWidth={1.75} />
            </div>
            <h2 className="font-display text-2xl text-navy">{emptyTitle}</h2>
            <p className="mt-2 text-sm app-muted">{emptyBody}</p>
            <div className="mt-6 grid gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-lg border border-navy/10 bg-white px-4 py-2.5 text-left text-[13px] text-navy/80 transition-colors hover:border-copper/40 hover:text-navy"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {items.map((item, idx) => {
            if (item.kind === "user") {
              return (
                <div key={idx} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-[14px] leading-relaxed text-white">
                  {item.files?.map((name) => (
                    <div
                      key={name}
                      className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] text-white/90"
                    >
                      <FileText size={13} strokeWidth={1.75} className="shrink-0 text-copper" />
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                  {item.text}
                </div>
              );
            }
            if (item.kind === "assistant") {
              return (
                <div key={idx} className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-navy/10 bg-white px-4 py-2.5 text-[14px] leading-relaxed text-navy">
                  {item.text}
                </div>
              );
            }
            if (item.kind === "tool") {
              return (
                <div key={idx} className="flex items-center gap-2 pl-1 text-xs app-muted">
                  {item.status === "running" ? (
                    <Loader2 size={13} className="animate-spin text-copper" />
                  ) : item.status === "error" ? (
                    <CircleX size={13} className="text-red-500" />
                  ) : (
                    <CircleCheck size={13} className="text-copper" />
                  )}
                  <Wrench size={12} strokeWidth={1.75} />
                  {TOOL_LABELS[item.name] ?? item.name}
                  {item.status === "error" && " — failed"}
                </div>
              );
            }
            if (item.kind === "download") {
              return (
                <div key={idx} className="max-w-[92%] rounded-xl border border-navy/10 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-copper">
                      <FileText size={18} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-navy">{item.fileName}</p>
                      <p className="text-xs app-muted">PDF — opens in a new tab, print from there</p>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="app-btn app-btn-primary !h-8 shrink-0 !px-3 text-xs"
                    >
                      <Download size={13} strokeWidth={2} className="mr-1.5" />
                      Open PDF
                    </a>
                  </div>
                </div>
              );
            }
            if (item.kind === "confirm") {
              return (
                <div key={idx} className="max-w-[92%] rounded-xl border border-copper/40 bg-copper/5 p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-navy">
                    <Banknote size={15} className="text-copper" />
                    Approval required
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-navy/80">
                    {item.confirmation.summary}
                  </p>
                  {item.resolved ? (
                    <div
                      className={cn(
                        "mt-3 inline-flex items-center gap-1.5 text-xs font-medium",
                        item.resolved === "approved" ? "text-copper" : "app-muted"
                      )}
                    >
                      {item.resolved === "approved" ? (
                        <>
                          <ShieldCheck size={13} /> Approved
                        </>
                      ) : (
                        <>
                          <CircleX size={13} /> Declined
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => resolveConfirmation(true)}
                        disabled={busy}
                        className="app-btn app-btn-primary !h-8 !px-4 text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => resolveConfirmation(false)}
                        disabled={busy}
                        className="app-btn app-btn-ghost !h-8 !px-4 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div key={idx} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
                {item.text}
              </div>
            );
          })}
          {busy && (
            <div className="flex items-center gap-2 pl-1 text-xs app-muted">
              <Loader2 size={13} className="animate-spin text-copper" />
              Working…
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="mx-auto w-full max-w-2xl pb-2"
        onDragOver={
          allowAttachments
            ? (e) => {
                e.preventDefault();
                setDragOver(true);
              }
            : undefined
        }
        onDragLeave={allowAttachments ? () => setDragOver(false) : undefined}
        onDrop={
          allowAttachments
            ? (e) => {
                e.preventDefault();
                setDragOver(false);
                if (!pending) uploadFiles(Array.from(e.dataTransfer.files));
              }
            : undefined
        }
      >
        {(attachments.length > 0 || uploading) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <span
                key={a.storage_path}
                className="inline-flex items-center gap-1.5 rounded-lg border border-navy/15 bg-white px-2.5 py-1.5 text-[12px] text-navy"
              >
                <FileText size={13} strokeWidth={1.75} className="text-copper" />
                <span className="max-w-[200px] truncate">{a.file_name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) =>
                      prev.filter((f) => f.storage_path !== a.storage_path)
                    )
                  }
                  className="text-navy/40 hover:text-navy"
                  title="Remove attachment"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
            {uploading && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-navy/15 bg-white px-2.5 py-1.5 text-[12px] app-muted">
                <Loader2 size={13} className="animate-spin text-copper" />
                Uploading…
              </span>
            )}
          </div>
        )}
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border bg-white p-2 shadow-sm focus-within:border-copper/50",
            dragOver ? "border-copper bg-copper/5" : "border-navy/15"
          )}
        >
          {allowAttachments && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept={ACCEPTED_FILE_TYPES}
                multiple
                onChange={(e) => {
                  uploadFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(pending) || uploading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-navy/15 bg-white text-navy/60 transition-colors hover:text-navy disabled:opacity-30"
                title="Attach a PDF or photo"
              >
                <Paperclip size={15} strokeWidth={1.75} />
              </button>
            </>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            placeholder={pending ? "Approve or cancel the pending action first…" : placeholder}
            disabled={Boolean(pending)}
            className="max-h-40 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] text-navy outline-none placeholder:text-navy/35 disabled:opacity-60"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleDictation}
              disabled={Boolean(pending)}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-30",
                listening
                  ? "border-rust bg-rust/10 text-rust animate-pulse"
                  : "border-navy/15 bg-white text-navy/60 hover:text-navy"
              )}
              title={listening ? "Stop dictation" : "Dictate"}
            >
              <Mic size={15} strokeWidth={1.75} />
            </button>
          )}
          <button
            type="submit"
            disabled={busy || uploading || (!input.trim() && attachments.length === 0) || Boolean(pending)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white transition-opacity disabled:opacity-30"
            title="Send"
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] app-muted">{footnote}</p>
      </form>
    </div>
  );
}
