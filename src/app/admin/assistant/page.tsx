import type { Metadata } from "next";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { anthropicConfigured } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assistant — 8th Street Construction",
};

export default function AdminAssistantPage() {
  const configured = anthropicConfigured();

  return (
    <div className="flex h-[100dvh] flex-col p-4 md:p-8 lg:p-10">
      <div className="mx-auto flex w-full max-w-2xl items-baseline justify-between">
        <div>
          <h1 className="font-display text-2xl text-navy">Assistant</h1>
          <p className="mt-1 text-sm app-muted">
            Type what you want done. It runs on your real books — invoices, Mercury, leads.
          </p>
        </div>
      </div>

      {configured ? (
        <div className="mx-auto mt-2 flex w-full min-h-0 max-w-3xl flex-1 flex-col">
          <AssistantChat />
        </div>
      ) : (
        <div className="mx-auto mt-8 w-full max-w-2xl rounded-xl border border-navy/10 bg-white p-6">
          <h2 className="text-[15px] font-semibold text-navy">AI is not configured</h2>
          <p className="mt-2 text-sm app-muted">
            Add <code className="rounded bg-navy/5 px-1.5 py-0.5 text-[12px]">ANTHROPIC_API_KEY</code>{" "}
            to the Vercel environment (and optionally{" "}
            <code className="rounded bg-navy/5 px-1.5 py-0.5 text-[12px]">ANTHROPIC_ASSISTANT_MODEL</code>)
            to enable the assistant.
          </p>
        </div>
      )}
    </div>
  );
}
