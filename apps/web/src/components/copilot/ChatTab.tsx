"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { useCopilot } from "@/lib/copilot/CopilotProvider";

const SUGGESTED_PROMPTS = [
  "How many beds do we have?",
  "Which departments don't have a head?",
  "What's our ICU to bed ratio?",
  "Give me a summary",
  "Are fire zones mapped?",
  "Which units have no rooms?",
];

export function ChatTab() {
  const { messages, chatLoading, sendMessage, health } = useCopilot();
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
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
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.length === 0 && !chatLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg
              className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Ask me about your hospital
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {health
                ? `${health.branchName} - ${health.overallHealth.replace("_", " ")}`
                : "Select a branch to get started"}
            </p>

            {/* Suggested prompts */}
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptClick(prompt)}
                  className="rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Source badge for assistant messages */}
              {msg.role === "assistant" && msg.source && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase",
                      msg.source === "ollama"
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                        : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                    )}
                  >
                    {msg.source === "ollama" ? "AI" : "Instant"}
                  </span>
                </div>
              )}

              {/* Follow-up suggestions */}
              {msg.role === "assistant" &&
                msg.followUp &&
                msg.followUp.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.followUp.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => handlePromptClick(f)}
                        className="rounded-full border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
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

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your infrastructure..."
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
                : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
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
