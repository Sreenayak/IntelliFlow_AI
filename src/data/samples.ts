import type { CssIconName } from "../components/CssIcon";

export const MIN_CODE_LENGTH = 15;
export const MAX_CODE_LENGTH = 15000;

export type ReviewFocus =
  | "full"
  | "security"
  | "performance"
  | "bugs"
  | "clean-code";

export type CodeLanguage =
  | "auto"
  | "typescript"
  | "javascript"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "sql"
  | "other";

export interface FocusOption {
  id: ReviewFocus;
  label: string;
  icon: CssIconName;
  summary: string;
}

export const FOCUS_OPTIONS: FocusOption[] = [
  {
    id: "full",
    label: "Full Audit",
    icon: "sliders",
    summary: "Correctness, security, performance, and maintainability.",
  },
  {
    id: "security",
    label: "Security",
    icon: "shield",
    summary: "Injection, auth checks, secret handling, and unsafe I/O.",
  },
  {
    id: "performance",
    label: "Performance",
    icon: "bolt",
    summary: "Time complexity, memory leaks, N+1 queries, and blocking calls.",
  },
  {
    id: "bugs",
    label: "Bugs & Races",
    icon: "bug",
    summary: "Race conditions, null safety, edge cases, and error paths.",
  },
  {
    id: "clean-code",
    label: "Clean Code",
    icon: "code",
    summary: "Readability, modular boundaries, types, and testability.",
  },
];

export const LANGUAGE_OPTIONS: { id: CodeLanguage; label: string }[] = [
  { id: "auto", label: "Auto-detect" },
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "java", label: "Java" },
  { id: "sql", label: "SQL" },
  { id: "other", label: "Other" },
];

export interface SampleSnippet {
  id: string;
  title: string;
  subtitle: string;
  language: CodeLanguage;
  focus: ReviewFocus;
  code: string;
}

export const SAMPLE_SNIPPETS: SampleSnippet[] = [
  {
    id: "react-race",
    title: "React Async Fetch Race",
    subtitle: "Stale responses & missing abort cleanup",
    language: "typescript",
    focus: "bugs",
    code: `import { useEffect, useState } from "react";

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(\`/api/users/\${userId}\`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}`,
  },
  {
    id: "express-sqli",
    title: "Express Order Endpoint",
    subtitle: "SQL injection, missing validation & leak",
    language: "javascript",
    focus: "security",
    code: `app.get("/api/orders", async (req, res) => {
  const { customerId, status } = req.query;
  const query = \`
    SELECT * FROM orders
    WHERE customer_id = '\${customerId}'
    AND status = '\${status}'
  \`;
  try {
    const result = await db.raw(query);
    res.json({ ok: true, orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.stack });
  }
});`,
  },
  {
    id: "python-cache",
    title: "Python Batch Aggregator",
    subtitle: "Unbounded cache & mutable default trap",
    language: "python",
    focus: "performance",
    code: `def aggregate_events(events, buckets={}):
    results = []
    for event in events:
        user_id = event["user_id"]
        if user_id not in buckets:
            buckets[user_id] = []
        buckets[user_id].append(event["score"])

    for uid, scores in buckets.items():
        avg = sum(scores) / len(scores)
        results.append({"user_id": uid, "avg": avg})

    return sorted(results, key=lambda x: x["avg"], reverse=True)`,
  },
];
