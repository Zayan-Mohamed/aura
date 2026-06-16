"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Copy, Check, Pencil } from "lucide-react";
import type { AuraUIMessage } from "@/lib/ai-types";
import { AuraMark } from "./aura-mark";
import { ToolPart } from "./tool-part";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { cn } from "@/lib/utils";

function AssistantBubble({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="w-fit max-w-[42rem] break-words rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-[0.95rem] leading-relaxed text-card-foreground shadow-sm ring-1 ring-border">
      <Markdown text={text} />
    </div>
  );
}

/**
 * A user turn: the prose bubble plus quiet hover actions — copy the prompt, and
 * (when editable) edit it in place. Editing truncates the turns after it and
 * regenerates, the same way ChatGPT/Claude do.
 */
function UserBubble({ text, onEdit }: { text: string; onEdit?: (next: string) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(text);
  const [copied, setCopied] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const grow = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, []);

  React.useEffect(() => {
    if (!editing) return;
    // Focus + size once the textarea mounts (DOM only — no state writes here).
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    grow();
  }, [editing, grow]);

  const startEditing = () => {
    setDraft(text);
    setEditing(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const save = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== text.trim()) onEdit?.(next);
  };

  if (editing) {
    return (
      <div className="ml-auto w-full max-w-[42rem]">
        <div className="rounded-2xl rounded-br-md border border-gold/40 bg-background p-2 shadow-sm">
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              grow();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") setEditing(false);
            }}
            className="aura-scroll max-h-60 w-full resize-none bg-transparent px-2 py-1.5 text-[0.95rem] leading-relaxed text-foreground outline-none"
          />
          <div className="mt-1 flex justify-end gap-2 px-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-gold-foreground transition-all hover:brightness-105"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group/um flex w-full flex-col items-end gap-1">
      <div className="ml-auto w-fit max-w-[42rem] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[0.95rem] leading-relaxed text-background">
        {text}
      </div>
      {/* Always visible — touch devices have no hover (this is a mobile-first app). */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={copy}
          aria-label="Copy prompt"
          className="grid size-7 place-items-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-3.5 text-jade" /> : <Copy className="size-3.5" />}
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Edit prompt"
            className="grid size-7 place-items-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ChatMessage({
  message,
  onAsk,
  onEdit,
}: {
  message: AuraUIMessage;
  onAsk?: (text: string) => void;
  /** Edit this user turn (truncate following turns + regenerate). Omit = read-only. */
  onEdit?: (id: string, next: string) => void;
}) {
  const isUser = message.role === "user";

  // Concatenated prose for this turn — fuels copy + read-aloud actions.
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n")
    .trim();

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
        {isUser ? (
          <>
            {message.metadata?.imageDataUrl && (
              <div className="overflow-hidden rounded-2xl rounded-br-md ring-1 ring-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.metadata.imageDataUrl}
                  alt="Attached photo"
                  className="max-h-56 w-auto max-w-[15rem] object-cover"
                />
              </div>
            )}
            <UserBubble
              text={text}
              onEdit={onEdit ? (next) => onEdit(message.id, next) : undefined}
            />
          </>
        ) : (
          <>
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                return <AssistantBubble key={i} text={part.text} />;
              }
              if (typeof part.type === "string" && part.type.startsWith("tool-")) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return <ToolPart key={i} part={part as any} onAsk={onAsk} />;
              }
              return null;
            })}
            {text && <MessageActions text={text} />}
          </>
        )}
      </div>
    </motion.div>
  );
}
