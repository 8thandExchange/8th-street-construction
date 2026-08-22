import type { Metadata } from "next";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { anthropicConfigured } from "@/lib/ai/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assistant — 8th Street Construction",
};

export default async function AdminAssistantPage(props: {
  searchParams: Promise<{ q?: string; project_id?: string }>;
}) {
  const { q, project_id: projectId } = await props.searchParams;
  const configured = anthropicConfigured();
  const supabase = await createClient();
  const { data: contextProject } = projectId
    ? await supabase
        .from("projects")
        .select("id, title, status, funding_type")
        .eq("id", projectId)
        .maybeSingle()
    : { data: null };
  const suggestions = contextProject
    ? [
        `Brief me on ${contextProject.title}: schedule, cash, and risks`,
        `What needs a decision on ${contextProject.title}?`,
        `Show me outstanding invoices and commitments for ${contextProject.title}`,
        `Draft a concise client update for ${contextProject.title}`,
      ]
    : [
        "Give me today’s operating brief — jobs, cash, and commitments",
        "Which jobs need attention, and why?",
        "What client money is outstanding or overdue?",
        "What is still open from our meetings?",
      ];

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col p-4 md:p-8 lg:min-h-screen lg:p-10">
      <div className="mx-auto flex w-full max-w-3xl items-baseline justify-between">
        <div>
          <span className="app-label !text-copper">AI operations partner</span>
          <h1 className="mt-1 app-h1 !text-[24px]">
            {contextProject ? contextProject.title : "Assistant"}
          </h1>
          <p className="mt-1 text-sm app-muted">
            {contextProject
              ? "Ask about this job or prepare the next action. Changes that reach a client wait for review."
              : "Ask across your live jobs, books, meetings, clients, and vendors."}
          </p>
        </div>
      </div>

      {configured ? (
        <div className="mx-auto mt-2 flex w-full min-h-0 max-w-3xl flex-1 flex-col">
          <AssistantChat
            initialPrompt={q?.trim() || undefined}
            config={{
              allowAttachments: true,
              suggestions,
              ...(contextProject
                ? {
                    context: {
                      projectId: contextProject.id,
                      title: contextProject.title,
                    },
                    emptyTitle: "What should we handle on this job?",
                    placeholder: `Ask about ${contextProject.title}…`,
                  }
                : {}),
            }}
          />
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
