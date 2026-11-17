import { useCallback, useEffect, useRef, useState } from "react";
import { ChecksGuideModal } from "./components/ChecksGuideModal";
import { CodeEditorPane } from "./components/CodeEditorPane";
import { CssIcon } from "./components/CssIcon";
import {
  HistoryDrawer,
  type ReviewHistoryEntry,
} from "./components/HistoryDrawer";
import {
  ReviewOutputPane,
  type ReviewStatus,
} from "./components/ReviewOutputPane";
import {
  MAX_CODE_LENGTH,
  MIN_CODE_LENGTH,
  type CodeLanguage,
  type ReviewFocus,
  type SampleSnippet,
} from "./data/samples";

const HISTORY_STORAGE_KEY = "codebench_review_history_v1";
const THEME_STORAGE_KEY = "codebench_theme_v1";
const REVIEW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

function safeGetStorage(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage access errors in restricted iframes
  }
}

function extractSnippetTitle(code: string): string {
  const firstMeaningfulLine = code
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("//") && !line.startsWith("import "));

  if (!firstMeaningfulLine) return "Untitled snippet";
  return firstMeaningfulLine.length > 56
    ? `${firstMeaningfulLine.slice(0, 53)}...`
    : firstMeaningfulLine;
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = safeGetStorage(THEME_STORAGE_KEY);
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<CodeLanguage>("auto");
  const [focus, setFocus] = useState<ReviewFocus>("full");
  const [status, setStatus] = useState<ReviewStatus>("idle");
  const [markdown, setMarkdown] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [history, setHistory] = useState<ReviewHistoryEntry[]>(() => {
    try {
      const raw = safeGetStorage(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      safeSetStorage(THEME_STORAGE_KEY, "dark");
    } else {
      root.classList.remove("dark");
      safeSetStorage(THEME_STORAGE_KEY, "light");
    }
  }, [darkMode]);

  useEffect(() => {
    safeSetStorage(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
  }, [history]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCodeChange = (next: string) => {
    setCode(next);
    if (validationError) {
      setValidationError(null);
    }
  };

  const validateInput = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return "Code input cannot be empty. Paste or load a snippet before running a review.";
    }
    if (trimmed.length < MIN_CODE_LENGTH) {
      return `Code snippet is too short (${trimmed.length} chars). Enter at least ${MIN_CODE_LENGTH} characters for a meaningful review.`;
    }
    if (value.length > MAX_CODE_LENGTH) {
      return `Code snippet exceeds the ${MAX_CODE_LENGTH.toLocaleString()} character limit (${value.length.toLocaleString()} chars entered). Trim the snippet and try again.`;
    }
    return null;
  }, []);

  const runReview = useCallback(async () => {
    const inputIssue = validateInput(code);
    if (inputIssue) {
      setValidationError(inputIssue);
      return;
    }

    setValidationError(null);
    if (import.meta.env.PROD && !REVIEW_API_BASE_URL) {
      setStreamError(
        "The review API is not configured for this deployment. Set VITE_API_BASE_URL to your backend URL and redeploy."
      );
      setStatus("error");
      return;
    }

    setStreamError(null);
    setMarkdown("");
    setStatus("connecting");
    setElapsedMs(0);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startedAt = performance.now();
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setElapsedMs(Math.round(performance.now() - startedAt));
    }, 100);

    let accumulated = "";
    let receivedErrorEvent = false;

    try {
      const reviewUrl = REVIEW_API_BASE_URL
        ? `${REVIEW_API_BASE_URL}/api/review`
        : "/api/review";
      const response = await fetch(reviewUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
          focus,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMsg = `Request failed with status ${response.status}.`;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            errorMsg = payload.error;
          }
        } catch {
          // Keep generic HTTP error
        }
        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error("Streaming response body was unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processSseFrame = (frame: string) => {
        const lines = frame.split(/\r?\n/);
        let eventType = "message";
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        if (dataLines.length === 0) return;
        const rawData = dataLines.join("\n");

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(rawData) as Record<string, unknown>;
        } catch {
          return;
        }

        if (eventType === "start") {
          setStatus("streaming");
        } else if (eventType === "chunk") {
          const chunkText =
            typeof parsed.text === "string" ? parsed.text : "";
          if (chunkText) {
            accumulated += chunkText;
            setMarkdown(accumulated);
            setStatus("streaming");
          }
        } else if (eventType === "error") {
          receivedErrorEvent = true;
          const msg =
            typeof parsed.message === "string"
              ? parsed.message
              : "Streaming failed unexpectedly.";
          setStreamError(msg);
          setStatus("error");
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          if (frame.trim()) {
            processSseFrame(frame);
          }
        }
      }

      if (buffer.trim()) {
        processSseFrame(buffer);
      }

      stopTimer();
      const totalElapsed = Math.round(performance.now() - startedAt);
      setElapsedMs(totalElapsed);

      if (!receivedErrorEvent) {
        if (!accumulated.trim()) {
          setStreamError("No review content was returned by the server.");
          setStatus("error");
        } else {
          setStatus("completed");
          const entry: ReviewHistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: extractSnippetTitle(code),
            code,
            language,
            focus,
            markdown: accumulated,
            createdAt: new Date().toISOString(),
            elapsedMs: totalElapsed,
          };
          setHistory((prev) => [entry, ...prev].slice(0, 20));
        }
      }
    } catch (err) {
      stopTimer();
      setElapsedMs(Math.round(performance.now() - startedAt));

      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus(accumulated ? "completed" : "idle");
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Network error while communicating with the review server.";
      setStreamError(message);
      setStatus("error");
    } finally {
      abortControllerRef.current = null;
    }
  }, [code, focus, language, validateInput]);

  const handleStopStream = () => {
    abortControllerRef.current?.abort();
    stopTimer();
  };

  const handleSelectSample = (sample: SampleSnippet) => {
    if (status === "connecting" || status === "streaming") return;
    setCode(sample.code);
    setLanguage(sample.language);
    setFocus(sample.focus);
    setValidationError(null);
    setStreamError(null);
    setMarkdown("");
    setStatus("idle");
    setElapsedMs(0);
  };

  const handleResetWorkspace = () => {
    abortControllerRef.current?.abort();
    stopTimer();
    setCode("");
    setLanguage("auto");
    setFocus("full");
    setMarkdown("");
    setValidationError(null);
    setStreamError(null);
    setStatus("idle");
    setElapsedMs(0);
  };

  const handleLoadHistoryEntry = (entry: ReviewHistoryEntry) => {
    abortControllerRef.current?.abort();
    stopTimer();
    setCode(entry.code);
    setLanguage(entry.language);
    setFocus(entry.focus);
    setMarkdown(entry.markdown);
    setElapsedMs(entry.elapsedMs);
    setValidationError(null);
    setStreamError(null);
    setStatus("completed");
    setHistoryOpen(false);
  };

  const isStreaming = status === "connecting" || status === "streaming";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title */}
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <CssIcon
              name="logo"
              size={28}
              className="text-white"
            />
            <span>IntelliFlow AI</span>
          </a>

          {/* Zone 2: Concise Navigation Links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
          >
            <a
              href="#workbench"
              className="text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
            >
              Workbench
            </a>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              History ({history.length})
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Checks Guide
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleResetWorkspace}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              New Review
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="workbench"
        className="flex-1 w-full max-w-[1760px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5"
      >
        {/* Workspace Title & Utility Row */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
              AI Code Review Studio
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Paste source code for a server-side streaming audit covering
              correctness, security, and refactored fixes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CssIcon name="history" size={14} />
              <span>History ({history.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CssIcon name={darkMode ? "sun" : "moon"} size={14} />
              <span>{darkMode ? "Light mode" : "Dark mode"}</span>
            </button>
          </div>
        </div>

        {/* Two-column Workbench Split */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          <CodeEditorPane
            code={code}
            language={language}
            focus={focus}
            isStreaming={isStreaming}
            validationError={validationError}
            onCodeChange={handleCodeChange}
            onLanguageChange={setLanguage}
            onFocusChange={setFocus}
            onSelectSample={handleSelectSample}
            onRunReview={runReview}
            onStopStream={handleStopStream}
            onClear={handleResetWorkspace}
          />

          <ReviewOutputPane
            status={status}
            markdown={markdown}
            errorMessage={streamError}
            focus={focus}
            language={language}
            elapsedMs={elapsedMs}
            onRetry={runReview}
            onSelectSample={handleSelectSample}
          />
        </div>
      </main>

      <HistoryDrawer
        open={historyOpen}
        entries={history}
        onClose={() => setHistoryOpen(false)}
        onLoadEntry={handleLoadHistoryEntry}
        onDeleteEntry={(id) =>
          setHistory((prev) => prev.filter((item) => item.id !== id))
        }
        onClearAll={() => setHistory([])}
      />

      <ChecksGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  );
}
