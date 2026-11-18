import { useMemo, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import {
  FOCUS_OPTIONS,
  LANGUAGE_OPTIONS,
  MAX_CODE_LENGTH,
  MIN_CODE_LENGTH,
  SAMPLE_SNIPPETS,
  type CodeLanguage,
  type ReviewFocus,
  type SampleSnippet,
} from "../data/samples";
import { CssIcon } from "./CssIcon";
import { LocalPreflightPanel } from "./LocalPreflightPanel";

interface CodeEditorPaneProps {
  code: string;
  language: CodeLanguage;
  focus: ReviewFocus;
  isStreaming: boolean;
  validationError: string | null;
  onCodeChange: (value: string) => void;
  onLanguageChange: (language: CodeLanguage) => void;
  onFocusChange: (focus: ReviewFocus) => void;
  onSelectSample: (sample: SampleSnippet) => void;
  onRunReview: () => void;
  onStopStream: () => void;
  onClear: () => void;
}

export function CodeEditorPane({
  code,
  language,
  focus,
  isStreaming,
  validationError,
  onCodeChange,
  onLanguageChange,
  onFocusChange,
  onSelectSample,
  onRunReview,
  onStopStream,
  onClear,
}: CodeEditorPaneProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lineCount = useMemo(() => {
    if (!code) return 1;
    return code.split(/\r?\n/).length;
  }, [code]);

  const charCount = code.length;
  const trimmedLength = code.trim().length;
  const isOverLimit = charCount > MAX_CODE_LENGTH;
  const isNearLimit = charCount > MAX_CODE_LENGTH * 0.85 && !isOverLimit;

  const lineNumbers = useMemo(() => {
    const count = Math.max(lineCount, 14);
    return Array.from({ length: count }, (_, idx) => idx + 1);
  }, [lineCount]);

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isStreaming) {
        onRunReview();
      }
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = code.slice(0, start) + "  " + code.slice(end);
      onCodeChange(updated);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const extMap: Record<string, CodeLanguage> = {
          ts: "typescript",
          tsx: "typescript",
          js: "javascript",
          jsx: "javascript",
          mjs: "javascript",
          py: "python",
          go: "go",
          rs: "rust",
          java: "java",
          sql: "sql",
        };
        if (ext && extMap[ext]) {
          onLanguageChange(extMap[ext]);
        }
        onCodeChange(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const activeFocus = FOCUS_OPTIONS.find((item) => item.id === focus);

  return (
    <section
      aria-label="Source Code Input"
      className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Toolbar header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
        <div className="flex items-center gap-2 min-w-0">
          <CssIcon
            name="code"
            size={16}
            className="text-slate-700 dark:text-slate-300"
          />
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            Source Input
          </h2>
          <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
            <span aria-hidden="true" className="mr-2">
              ·
            </span>
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ts,.tsx,.js,.jsx,.mjs,.py,.go,.rs,.java,.sql,.css,.html,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CssIcon name="upload" size={13} />
            <span>Load file</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={isStreaming || code.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CssIcon name="trash" size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Quick sample bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
          Examples:
        </span>
        <div className="flex items-center gap-1.5">
          {SAMPLE_SNIPPETS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={isStreaming}
              onClick={() => onSelectSample(sample)}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Review parameters */}
      <div className="flex flex-col gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Review focus"
            className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/90"
          >
            {FOCUS_OPTIONS.map((option) => {
              const active = focus === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isStreaming}
                  onClick={() => onFocusChange(option.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <CssIcon name={option.icon} size={13} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 shrink-0">
            <span className="font-medium whitespace-nowrap">Language</span>
            <select
              value={language}
              disabled={isStreaming}
              onChange={(e) => onLanguageChange(e.target.value as CodeLanguage)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30 cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {activeFocus ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeFocus.summary}
          </p>
        ) : null}
      </div>

      {/* Line-numbered code editor */}
      <div className="relative flex flex-1 min-h-[340px] lg:min-h-[420px] bg-white dark:bg-slate-950/60 overflow-hidden">
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-12 py-4 pr-3 text-right select-none overflow-hidden bg-slate-50 dark:bg-slate-900/60 border-r border-slate-200/80 dark:border-slate-800 font-mono text-[13px] leading-6 text-slate-400 dark:text-slate-600 tabular-nums shrink-0"
        >
          {lineNumbers.map((num) => (
            <div key={num}>{num}</div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          placeholder="Paste a function, route handler, React component, or SQL query here (minimum 15 characters)..."
          aria-label="Paste source code for review"
          className="flex-1 w-full h-full py-4 px-4 resize-none bg-transparent font-mono text-[13px] leading-6 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none overflow-auto"
        />
      </div>

      <LocalPreflightPanel code={code} />

      {/* Inline validation feedback */}
      {validationError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 px-4 py-2.5 border-t border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300"
        >
          <CssIcon name="alert" size={15} className="mt-0.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      ) : null}

      {/* Footer action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs tabular-nums">
          <span
            className={
              isOverLimit
                ? "font-semibold text-red-600 dark:text-red-400"
                : isNearLimit
                ? "font-medium text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400"
            }
          >
            {charCount.toLocaleString()} / {MAX_CODE_LENGTH.toLocaleString()} chars
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            ·
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {trimmedLength < MIN_CODE_LENGTH
              ? `Min ${MIN_CODE_LENGTH} chars`
              : "Cmd/Ctrl + Enter to run"}
          </span>
        </div>

        {isStreaming ? (
          <button
            type="button"
            onClick={onStopStream}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CssIcon name="stop" size={13} />
            <span>Stop Stream</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onRunReview}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CssIcon name="play" size={13} />
            <span>Run Review</span>
          </button>
        )}
      </div>
    </section>
  );
}
