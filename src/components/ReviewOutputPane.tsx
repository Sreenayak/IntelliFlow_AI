import { useState } from "react";
import {
  FOCUS_OPTIONS,
  LANGUAGE_OPTIONS,
  SAMPLE_SNIPPETS,
  type CodeLanguage,
  type ReviewFocus,
  type SampleSnippet,
} from "../data/samples";
import { CssIcon } from "./CssIcon";
import { MarkdownReview } from "./MarkdownReview";

export type ReviewStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "completed"
  | "error";

interface ReviewOutputPaneProps {
  status: ReviewStatus;
  markdown: string;
  errorMessage: string | null;
  focus: ReviewFocus;
  language: CodeLanguage;
  elapsedMs: number;
  onRetry: () => void;
  onSelectSample: (sample: SampleSnippet) => void;
}

export function ReviewOutputPane({
  status,
  markdown,
  errorMessage,
  focus,
  language,
  elapsedMs,
  onRetry,
  onSelectSample,
}: ReviewOutputPaneProps) {
  const [copiedReport, setCopiedReport] = useState(false);

  const focusLabel =
    FOCUS_OPTIONS.find((item) => item.id === focus)?.label ?? "Full Audit";
  const languageLabel =
    LANGUAGE_OPTIONS.find((item) => item.id === language)?.label ?? "Auto";

  const handleCopyReport = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadReport = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `codebench-review-${focus}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formattedDuration = `${(elapsedMs / 1000).toFixed(1)}s`;

  return (
    <section
      aria-label="Review Report"
      className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
        <div className="flex items-center gap-2 min-w-0">
          <CssIcon
            name="shield"
            size={16}
            className="text-slate-700 dark:text-slate-300"
          />
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            Review Output
          </h2>
          {status !== "idle" ? (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap truncate">
              <span aria-hidden="true" className="mr-2">
                ·
              </span>
              {focusLabel}
              <span aria-hidden="true" className="mx-1.5">
                ·
              </span>
              {languageLabel}
              {elapsedMs > 0 ? (
                <>
                  <span aria-hidden="true" className="mx-1.5">
                    ·
                  </span>
                  {formattedDuration}
                </>
              ) : null}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyReport}
            disabled={!markdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CssIcon name={copiedReport ? "check" : "copy"} size={13} />
            <span>{copiedReport ? "Copied" : "Copy report"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={!markdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CssIcon name="download" size={13} />
            <span>Export .md</span>
          </button>
        </div>
      </div>

      {/* Streaming progress bar */}
      {status === "connecting" || status === "streaming" ? (
        <div
          aria-label="Streaming review in progress"
          className="h-0.5 w-full bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 cb-stream-bar"
        />
      ) : null}

      {/* Main viewport */}
      <div className="flex-1 p-5 overflow-y-auto min-h-[380px] lg:min-h-[480px]">
        {status === "error" && errorMessage ? (
          <div
            role="alert"
            className="mb-5 p-4 rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40"
          >
            <div className="flex items-start gap-3">
              <CssIcon
                name="alert"
                size={18}
                className="text-red-600 dark:text-red-400 mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-semibold text-red-800 dark:text-red-200">
                  Review could not be completed
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300 leading-relaxed">
                  {errorMessage}
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    <CssIcon name="refresh" size={13} />
                    <span>Retry Review</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {status === "idle" && !markdown ? (
          <div className="h-full flex flex-col justify-center max-w-lg mx-auto py-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-4">
              <CssIcon name="sliders" size={20} />
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Ready to audit your code
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Paste a code snippet or load a file on the left, choose an audit
              focus, and run a streaming review. IntelliFlow AI inspects line-by-line
              logic, highlights concrete risks, and outputs a clean refactored
              replacement.
            </p>

            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                Or start with a real-world defect sample
              </p>
              <div className="space-y-2">
                {SAMPLE_SNIPPETS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => onSelectSample(sample)}
                    className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {sample.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {sample.subtitle}
                      </div>
                    </div>
                    <CssIcon
                      name="play"
                      size={12}
                      className="text-blue-600 dark:text-blue-400 shrink-0"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {status === "connecting" && !markdown ? (
          <div className="space-y-5" aria-busy="true" aria-label="Loading review">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Analyzing code structure and streaming findings...</span>
            </div>
            <div className="space-y-2.5">
              <div className="h-5 w-40 rounded cb-skeleton" />
              <div className="h-4 w-full rounded cb-skeleton" />
              <div className="h-4 w-5/6 rounded cb-skeleton" />
            </div>
            <div className="space-y-2.5 pt-3">
              <div className="h-5 w-32 rounded cb-skeleton" />
              <div className="h-4 w-11/12 rounded cb-skeleton" />
              <div className="h-4 w-4/5 rounded cb-skeleton" />
              <div className="h-28 w-full rounded-lg cb-skeleton" />
            </div>
          </div>
        ) : null}

        {markdown ? (
          <MarkdownReview
            content={markdown}
            isStreaming={status === "streaming"}
          />
        ) : null}
      </div>

      {/* Status footer */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        <span>
          {status === "idle" && "Waiting for submission"}
          {status === "connecting" && "Connecting to review stream..."}
          {status === "streaming" && "Streaming response..."}
          {status === "completed" && "Review complete"}
          {status === "error" && "Review interrupted"}
        </span>
        {markdown ? (
          <span>{markdown.length.toLocaleString()} chars output</span>
        ) : null}
      </div>
    </section>
  );
}
