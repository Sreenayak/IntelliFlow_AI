export type PreflightSeverity = "high" | "medium";

export interface PreflightFinding {
  line: number;
  severity: PreflightSeverity;
  title: string;
  detail: string;
}

interface PreflightRule {
  pattern: RegExp;
  severity: PreflightSeverity;
  title: string;
  detail: string;
  ignoreCredentialPlaceholder?: boolean;
}

const RULES: PreflightRule[] = [
  {
    pattern:
      /\b(?:api[_-]?key|secret|password|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*(['"`])([^'"`]{8,})\1/i,
    severity: "high",
    title: "Possible hard-coded credential",
    detail:
      "Move credentials to a server-side environment variable or secret manager. This scan may flag test values.",
    ignoreCredentialPlaceholder: true,
  },
  {
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(/,
    severity: "high",
    title: "Dynamic code execution",
    detail:
      "Avoid evaluating code from strings; use explicit, constrained logic instead.",
  },
  {
    pattern:
      /\b(?:innerHTML\s*=|dangerouslySetInnerHTML\b|insertAdjacentHTML\s*\()/,
    severity: "high",
    title: "HTML inserted without visible sanitization",
    detail:
      "Ensure untrusted content is safely escaped or sanitized before inserting it as HTML.",
  },
  {
    pattern: /\b(?:pickle\.loads?\s*\(|yaml\.load\s*\()/,
    severity: "high",
    title: "Potentially unsafe deserialization",
    detail:
      "Only deserialize trusted data; prefer safe parsing APIs for untrusted input.",
  },
  {
    pattern:
      /\bverify\s*=\s*False\b|\brejectUnauthorized\s*:\s*false\b|\bInsecureSkipVerify\s*:\s*true\b/,
    severity: "high",
    title: "TLS certificate verification disabled",
    detail:
      "Keep certificate verification enabled to prevent insecure connections.",
  },
  {
    pattern:
      /\b(?:SELECT|INSERT|UPDATE|DELETE)\b.*(?:\$\{|["']\s*\+\s*[A-Za-z_$])/i,
    severity: "medium",
    title: "Possible SQL built with string interpolation",
    detail:
      "Use parameterized queries instead of interpolating values into SQL.",
  },
];

export function scanLocalPreflight(code: string): PreflightFinding[] {
  const findings: PreflightFinding[] = [];

  code.split(/\r?\n/).forEach((line, index) => {
    for (const rule of RULES) {
      const match = rule.pattern.exec(line);
      if (!match) continue;

      if (rule.ignoreCredentialPlaceholder) {
        const value = match[2]?.trim() ?? "";
        if (
          /^(?:your|example|sample|placeholder|change.?me|replace.?me|xxx+|<.*>)/i.test(
            value
          )
        ) {
          continue;
        }
      }

      findings.push({
        line: index + 1,
        severity: rule.severity,
        title: rule.title,
        detail: rule.detail,
      });
    }
  });

  return findings;
}
