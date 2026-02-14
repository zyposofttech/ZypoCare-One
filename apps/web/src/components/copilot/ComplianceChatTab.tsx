"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { useCopilot } from "@/lib/copilot/CopilotProvider";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronRight } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Where do I start?",
  "What is NABH?",
  "What is ABDM?",
  "What documents do I need?",
  "What should I do on this page?",
  "What's next?",
];

export function ComplianceChatTab() {
  const {
    complianceMessages: messages,
    complianceChatLoading: chatLoading,
    sendComplianceMessage: sendMessage,
  } = useCopilot();
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handlePromptClick = (prompt: string) => {
    if (chatLoading) return;
    sendMessage(prompt);
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !chatLoading && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Sparkles className="h-8 w-8 text-indigo-300 dark:text-indigo-600 mb-3" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Ask me about compliance
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              I can explain terms, guide you through setup, and answer questions
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptClick(prompt)}
                  className="rounded-full border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-500/10 dark:hover:border-indigo-500/30 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
            )}>
              <div className="whitespace-pre-wrap">
                {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={i}>{part.slice(2, -2)}</strong>
                  ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                  ),
                )}
              </div>
              {msg.role === "assistant" && msg.source && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase",
                    msg.source === "knowledge_base" && "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
                    msg.source === "contextual" && "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
                    msg.source === "ollama" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
                  )}>
                    {msg.source === "knowledge_base" ? "Knowledge" : msg.source === "contextual" ? "Contextual" : "AI"}
                  </span>
                </div>
              )}
              {msg.role === "assistant" && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.suggestedActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => action.actionHref && router.push(action.actionHref as any)}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      <ChevronRight className="h-3 w-3" />
                      {action.actionLabel ?? action.title}
                    </button>
                  ))}
                </div>
              )}
              {msg.role === "assistant" && msg.followUp && msg.followUp.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {msg.followUp.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handlePromptClick(f)}
                      className="rounded-full border border-zinc-300 dark:border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about compliance..."
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={chatLoading}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={chatLoading || !input.trim()}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              input.trim() && !chatLoading
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800",
            )}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
