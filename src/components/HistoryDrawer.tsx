import {
  FOCUS_OPTIONS,
  LANGUAGE_OPTIONS,
  type CodeLanguage,
  type ReviewFocus,
} from "../data/samples";
import { CssIcon } from "./CssIcon";

export interface ReviewHistoryEntry {
  id: string;
  title: string;
  code: string;
  language: CodeLanguage;
  focus: ReviewFocus;
  markdown: string;
  createdAt: string;
  elapsedMs: number;
}

interface HistoryDrawerProps {
  open: boolean;
  entries: ReviewHistoryEntry[];
  onClose: () => void;
  onLoadEntry: (entry: ReviewHistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryDrawer({
  open,
  entries,
  onClose,
  onLoadEntry,
  onDeleteEntry,
  onClearAll,
}: HistoryDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <aside
        aria-label="Review History"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CssIcon
              name="history"
              size={16}
              className="text-slate-700 dark:text-slate-300"
            />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Review History
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              · {entries.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 ? (
              <button
                type="button"
                onClick={onClearAll}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Clear all
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close history"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <CssIcon name="close" size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {entries.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-3">
                <CssIcon name="history" size={18} />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                No saved reviews yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Completed code reviews are saved locally in your browser so you
                can inspect them anytime.
              </p>
            </div>
          ) : (
            entries.map((entry) => {
              const focusLabel =
                FOCUS_OPTIONS.find((f) => f.id === entry.focus)?.label ??
                "Full Audit";
              const langLabel =
                LANGUAGE_OPTIONS.find((l) => l.id === entry.language)?.label ??
                "Auto";
              const dateLabel = new Date(entry.createdAt).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );

              return (
                <div
                  key={entry.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadEntry(entry)}
                      className="text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {entry.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {focusLabel} · {langLabel} · {dateLabel} ·{" "}
                        {(entry.elapsedMs / 1000).toFixed(1)}s
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(entry.id)}
                      aria-label="Delete saved review"
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <CssIcon name="trash" size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
