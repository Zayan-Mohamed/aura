"use client";

import * as React from "react";

/**
 * Tiny, safe markdown renderer for assistant text - no dependencies, no raw
 * HTML. Supports paragraphs, bullet/numbered lists, **bold**, *italic*,
 * `code`, and [links](url). Anything that looks like an HTML tag or a markdown
 * table is stripped, so a chatty model can never dump <img> tags or a pasted
 * product table into the conversation.
 */

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Strip stray HTML tags defensively.
  const clean = text.replace(/<[^>]+>/g, "");
  const nodes: React.ReactNode[] = [];
  // bold | italic | code | link
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(clean)) !== null) {
    if (m.index > last) nodes.push(clean.slice(last, m.index));
    if (m[2]) nodes.push(<strong key={`${keyBase}-b${i}`}>{m[2]}</strong>);
    else if (m[4]) nodes.push(<em key={`${keyBase}-i${i}`}>{m[4]}</em>);
    else if (m[6])
      nodes.push(
        <code key={`${keyBase}-c${i}`} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
          {m[6]}
        </code>,
      );
    else if (m[8])
      nodes.push(
        <a
          key={`${keyBase}-l${i}`}
          href={m[9]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold underline underline-offset-2"
        >
          {m[8]}
        </a>,
      );
    last = m.index + m[0].length;
    i++;
  }
  if (last < clean.length) nodes.push(clean.slice(last));
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  // Drop any markdown-table lines outright (pipe rows / separator rows).
  const lines = text
    .split("\n")
    .filter((l) => !/^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l) && !/^\s*\|.*\|\s*$/.test(l));

  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`p${blocks.length}`} className="whitespace-pre-wrap">
          {renderInline(para.join("\n"), `p${blocks.length}`)}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const L = list;
      const Tag = L.ordered ? "ol" : "ul";
      blocks.push(
        <Tag
          key={`l${blocks.length}`}
          className={L.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}
        >
          {L.items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `l${blocks.length}-${idx}`)}</li>
          ))}
        </Tag>,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else if (numbered) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
    } else if (line.trim() === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className="space-y-2 [&_strong]:font-semibold">{blocks}</div>;
}
