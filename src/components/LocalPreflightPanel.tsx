import { useMemo } from "react";
import { scanLocalPreflight } from "../data/localPreflight";
import { CssIcon } from "./CssIcon";

interface LocalPreflightPanelProps {
  code: string;
}

export function LocalPreflightPanel({ code }: LocalPreflightPanelProps) {
  const findings = useMemo(() => scanLocalPreflight(code), [code]);
  const highCount = findings.filter(
    (finding) => finding.severity === "high"
  ).length;

  return (
    <details className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <summary className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs cursor-pointer">
        <CssIcon
          name="shield"
          size={15}
          className="text-slate-700 dark:text-slate-300"
        />
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          Local Preflight
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          Instant checks; code stays in your browser
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 font-medium ${
            highCount > 0
              ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
              : findings.length > 0
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
          }`}
        >
          {code.trim()
            ? findings.length === 0
              ? "No matches"
              : `${findings.length} ${findings.length === 1 ? "match" : "matches"}`
            : "Ready"}
        </span>
      </summary>

      <div className="px-4 pb-4">
        {!code.trim() ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add code to check it for common risky patterns.
          </p>
        ) : findings.length === 0 ? (
          <p className="text-xs text-slate-600 dark:text-slate-300">
            No patterns matched these quick checks. This is not a complete
            security or correctness audit.
          </p>
        ) : (
          <ul className="space-y-2">
            {findings.map((finding, index) => (
              <li
                key={`${finding.line}-${finding.title}-${index}`}
                className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 p-3"
              >
                <CssIcon
                  name="alert"
                  size={14}
                  className={`mt-0.5 shrink-0 ${
                    finding.severity === "high"
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {finding.title}
                    <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                      Line {finding.line}
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {finding.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
          Heuristic checks can miss issues or flag safe code; verify findings
          manually.
        </p>
      </div>
    </details>
  );
}
