"use client";

import { motion } from "motion/react";
import type { AuraUIMessage } from "@/lib/ai-types";
import { AuraMark } from "./aura-mark";
import { ToolPart } from "./tool-part";
import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";

function TextBubble({ text, role }: { text: string; role: "user" | "assistant" }) {
  if (!text.trim()) return null;
  return (
    <div
      className={cn(
        "w-fit max-w-[42rem] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed",
        role === "user"
          ? "ml-auto whitespace-pre-wrap rounded-br-md bg-foreground text-background"
          : "rounded-bl-md bg-card text-card-foreground shadow-sm ring-1 ring-border",
      )}
    >
      {role === "user" ? text : <Markdown text={text} />}
    </div>
  );
}

export function ChatMessage({
  message,
  onAsk,
}: {
  message: AuraUIMessage;
  onAsk?: (text: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gold/12 ring-1 ring-gold/20">
          <AuraMark className="size-5" />
        </div>
      )}

      <div className={cn("flex min-w-0 flex-1 flex-col gap-3", isUser ? "items-end" : "items-start")}>
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return <TextBubble key={i} text={part.text} role={isUser ? "user" : "assistant"} />;
          }
          if (typeof part.type === "string" && part.type.startsWith("tool-")) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return <ToolPart key={i} part={part as any} onAsk={onAsk} />;
          }
          return null;
        })}
      </div>
    </motion.div>
  );
}
