"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Banknote,
  CircleCheck,
  CircleX,
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

type DisplayItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; name: string; status: "running" | "done" | "error" }
  | { kind: "confirm"; confirmation: PendingConfirmation; resolved?: "approved" | "declined" }
  | { kind: "error"; text: string };

const TOOL_LABELS: Record<string, string> = {
  list_projects: "Looking up projects",
  find_people: "Searching people",
  get_project_billing: "Pulling billing details",
  list_recent_leads: "Fetching leads",
  company_snapshot: "Running the numbers",
  create_invoice: "Creating invoice",
  send_invoice: "Sending invoice",
  mark_invoice_paid: "Marking invoice paid",
  get_project_schedule: "Reading the schedule",
  update_milestone: "Updating the schedule",
  send_client_message: "Drafting client message",
  create_portal_user: "Setting up portal login",
};

const SUGGESTIONS = [
  "Where are we on 608 Macon — are we on schedule?",
  "Message Habitat that the slab pours Friday and framing starts the week after",
  "Send an invoice to Habitat for $12,500 for the framing draw",
  "Flag exterior paint as a volunteer stage — note that Habitat crews are welcome",
];

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

export function AssistantChat({ initialPrompt }: { initialPrompt?: string }) {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [attachments, setAttachments] = useState<
    { name: string; storage_path: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HistoryMessage[]>([]);
  const autoSent = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const dictationBase = useRef("");
  historyRef.current = history;

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

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        const form = new FormData();
        form.set("file", file);
        const res = await fetch("/api/assistant/upload", { method: "POST", body: form });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.storage_path) {
          setAttachments((prev) => [
            ...prev,
            { name: String(json.name), storage_path: String(json.storage_path) },
          ]);
        } else {
          setItems((prev) => [
            ...prev,
            { kind: "error", text: json?.error ?? `Upload failed for ${file.name}` },
          ]);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  const streamTurn = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await fetch("/api/assistant", {
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
              setItems((prev) => {
                const next = [...prev];
                for (let idx = next.length - 1; idx >= 0; idx--) {
                  const item = next[idx];
                  if (item.kind === "tool" && item.name === name && item.status === "running") {
                    next[idx] = { kind: "tool", name, status: isError ? "error" : "done" };
                    break;
                  }
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
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy || pending) return;
      setInput("");
      // Attached files ride along as metadata the model can hand to tools.
      const attachmentBlock = attachments.length
        ? `\n\n[Attached files:\n${attachments
            .map((a) => `- "${a.name}" — storage_path: ${a.storage_path}`)
            .join("\n")}]`
        : "";
      setAttachments([]);
      setItems((prev) => [
        ...prev,
        {
          kind: "user",
          text: attachments.length
            ? `${trimmed}\n📎 ${attachments.map((a) => a.name).join(", ")}`
            : trimmed,
        },
      ]);
      const userMessage: HistoryMessage = { role: "user", content: trimmed + attachmentBlock };
      const messages = [...historyRef.current, userMessage];
      setHistory(messages);
      await streamTurn({ messages });
    },
    [busy, pending, streamTurn, attachments]
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
            <h2 className="font-display text-2xl text-navy">What needs doing?</h2>
            <p className="mt-2 text-sm app-muted">
              Invoicing, schedules, client messages, leads — type it or tap the mic and say it.
              Anything that moves money or reaches a client waits for your approval first.
            </p>
            <div className="mt-6 grid gap-2">
              {SUGGESTIONS.map((s) => (
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
      >
        {(attachments.length > 0 || uploading) && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {attachments.map((a, idx) => (
              <span
                key={`${a.storage_path}-${idx}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-navy/15 bg-white px-2.5 py-1 text-[12px] text-navy/80"
              >
                <FileText size={13} className="text-copper" />
                {a.name}
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, i2) => i2 !== idx))
                  }
                  className="text-navy/40 hover:text-navy"
                  title="Remove"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
            {uploading && (
              <span className="inline-flex items-center gap-1.5 text-[12px] app-muted">
                <Loader2 size={13} className="animate-spin text-copper" /> Uploading…
              </span>
            )}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-navy/15 bg-white p-2 shadow-sm focus-within:border-copper/50">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={Boolean(pending) || uploading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-navy/15 bg-white text-navy/60 transition-colors hover:text-navy disabled:opacity-30"
            title="Attach a file (PDF, image, document)"
          >
            <Paperclip size={15} strokeWidth={1.75} />
          </button>
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
            placeholder={
              pending
                ? "Approve or cancel the pending action first…"
                : 'Try: "send an invoice to Habitat for $12,500"'
            }
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
            disabled={busy || !input.trim() || Boolean(pending)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white transition-opacity disabled:opacity-30"
            title="Send"
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] app-muted">
          Money actions and client messages require your approval before anything sends.
        </p>
      </form>
    </div>
  );
}
