import { useState } from "react";
import { CssIcon } from "./CssIcon";

interface MarkdownReviewProps {
  content: string;
  isStreaming?: boolean;
}

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string; severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" }
  | { type: "code"; lang: string; code: string; closed: boolean }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        if (lines[i].trim().startsWith("```")) {
          closed = true;
          i++;
          break;
        }
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: "code",
        lang,
        code: codeLines.join("\n"),
        closed,
      });
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      const rawTitle = line.slice(4).trim();
      const match = rawTitle.match(/^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*(.+)$/i);
      if (match) {
        blocks.push({
          type: "h3",
          severity: match[1].toUpperCase() as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
          text: match[2].trim(),
        });
      } else {
        blocks.push({ type: "h3", text: rawTitle });
      }
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (/^[-*]\s+/.test(lines[i].trim()) || /^\d+\.\s+/.test(lines[i].trim()))
      ) {
        items.push(lines[i].trim().replace(/^([-*]|\d+\.)\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("## ") &&
      !lines[i].startsWith("### ") &&
      !lines[i].trim().startsWith("```") &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="font-mono text-[13px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong
          key={idx}
          className="font-semibold text-slate-900 dark:text-slate-100"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function CodeBlock({
  lang,
  code,
  closed,
}: {
  lang: string;
  code: string;
  closed: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  return (
    <div className="my-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-900/90 text-xs text-slate-400">
        <span className="font-mono truncate">
          {lang || "code"}
          {!closed ? " · streaming" : ""}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <CssIcon name={copied ? "check" : "copy"} size={13} />
          <span>{copied ? "Copied" : "Copy snippet"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const SEVERITY_STYLE: Record<
  "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  { label: string; colorClass: string }
> = {
  CRITICAL: {
    label: "Critical",
    colorClass: "text-red-700 dark:text-red-400",
  },
  HIGH: {
    label: "High",
    colorClass: "text-amber-700 dark:text-amber-400",
  },
  MEDIUM: {
    label: "Medium",
    colorClass: "text-blue-700 dark:text-blue-400",
  },
  LOW: {
    label: "Low",
    colorClass: "text-slate-600 dark:text-slate-400",
  },
};

export function MarkdownReview({
  content,
  isStreaming = false,
}: MarkdownReviewProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
      {blocks.map((block, index) => {
        if (block.type === "h2") {
          return (
            <h2
              key={index}
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 pt-4 first:pt-0 pb-2 border-b border-slate-200 dark:border-slate-800"
            >
              {block.text}
            </h2>
          );
        }

        if (block.type === "h3") {
          const sev = block.severity ? SEVERITY_STYLE[block.severity] : null;
          return (
            <div
              key={index}
              className="pt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1"
            >
              {sev ? (
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight ${sev.colorClass}`}
                >
                  <CssIcon
                    name={
                      block.severity === "CRITICAL" || block.severity === "HIGH"
                        ? "alert"
                        : "bug"
                    }
                    size={13}
                  />
                  <span>{sev.label}</span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                    ·
                  </span>
                </span>
              ) : null}
              <h3 className="font-display text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                {block.text}
              </h3>
            </div>
          );
        }

        if (block.type === "code") {
          return (
            <CodeBlock
              key={index}
              lang={block.lang}
              code={block.code}
              closed={block.closed}
            />
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="space-y-1.5 pl-4 list-disc marker:text-slate-400 dark:marker:text-slate-600">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderInlineFormatting(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="leading-relaxed">
            {renderInlineFormatting(block.text)}
          </p>
        );
      })}

      {isStreaming ? (
        <span
          aria-hidden="true"
          className="inline-block w-2 h-4 align-middle bg-blue-600 dark:bg-blue-400 animate-pulse rounded-[1px]"
        />
      ) : null}
    </div>
  );
}
