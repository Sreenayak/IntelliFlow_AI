import {
  FOCUS_OPTIONS,
  MAX_CODE_LENGTH,
  MIN_CODE_LENGTH,
} from "../data/samples";
import { CssIcon } from "./CssIcon";

interface ChecksGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChecksGuideModal({ open, onClose }: ChecksGuideModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checks-guide-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CssIcon
              name="sliders"
              size={16}
              className="text-slate-700 dark:text-slate-300"
            />
            <h2
              id="checks-guide-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Audit Focus & Limits Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <CssIcon name="close" size={14} />
          </button>
        </div>

        <div className="p-5 space-y-5 text-sm text-slate-700 dark:text-slate-300 max-h-[75vh] overflow-y-auto">
          <div className="space-y-3">
            {FOCUS_OPTIONS.map((opt) => (
              <div
                key={opt.id}
                className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80 last:border-0 last:pb-0"
              >
                <div className="mt-0.5 text-slate-700 dark:text-slate-300">
                  <CssIcon name={opt.icon} size={15} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {opt.label}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {opt.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Input Validation & Shortcuts
            </div>
            <p className="tabular-nums">
              Accepted input length: {MIN_CODE_LENGTH} to{" "}
              {MAX_CODE_LENGTH.toLocaleString()} characters, enforced on both
              client and server.
            </p>
            <p>
              Press <code className="font-mono">Cmd/Ctrl + Enter</code> inside
              the editor to start a review, or <code className="font-mono">Tab</code>{" "}
              to insert two-space indentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
