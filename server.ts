import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MIN_CODE_LENGTH = 15;
const MAX_CODE_LENGTH = 15000;

const ALLOWED_FOCUSES = new Set([
  "full",
  "security",
  "performance",
  "bugs",
  "clean-code",
]);

const ALLOWED_LANGUAGES = new Set([
  "auto",
  "typescript",
  "javascript",
  "python",
  "go",
  "rust",
  "java",
  "sql",
  "other",
]);

const FOCUS_INSTRUCTIONS: Record<string, string> = {
  full: "Perform a comprehensive senior engineering code review covering correctness, bugs, edge cases, security vulnerabilities, performance bottlenecks, and maintainability.",
  security:
    "Focus intensely on application security: injection risks, auth/authz flaws, secret exposure, unsafe deserialization, XSS/CSRF, SSRF, path traversal, and insecure defaults.",
  performance:
    "Focus intensely on performance and resource efficiency: algorithmic complexity, N+1 queries, memory leaks, unnecessary allocations, blocking I/O, and concurrency bottlenecks.",
  bugs: "Focus intensely on logical bugs, race conditions, off-by-one errors, null/undefined handling, unhandled rejections, resource leaks, and boundary edge cases.",
  "clean-code":
    "Focus on readability, cohesion, naming clarity, error handling ergonomics, testability, type safety, and eliminating unnecessary complexity.",
};

function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function buildSystemInstruction(focus: string, language: string): string {
  const focusNote =
    FOCUS_INSTRUCTIONS[focus] ?? FOCUS_INSTRUCTIONS.full;
  const languageNote =
    language === "auto"
      ? "Infer the programming language and runtime idioms from the snippet."
      : `Evaluate this code using idiomatic ${language} standards and runtime semantics.`;

  return [
    "You are an exacting staff software engineer performing a structured code review.",
    focusNote,
    languageNote,
    "",
    "Respond in clean, well-structured Markdown using ONLY these exact top-level sections in order:",
    "## Summary",
    "Give a concise 2-3 sentence assessment of what the code does and its primary risk or strength.",
    "",
    "## Findings",
    "List concrete issues ordered from highest to lowest impact. For each finding, use this exact format:",
    "### [CRITICAL|HIGH|MEDIUM|LOW] Short descriptive title (Line X or Lines X-Y)",
    "- **Why it matters:** Concrete failure mode or consequence.",
    "- **Fix:** Specific, actionable correction.",
    "If there are zero defects, state that clearly and offer 1-2 thoughtful hardening improvements.",
    "",
    "## Refactored Code",
    "Provide a complete, drop-in improved version inside a single fenced code block with the appropriate language tag.",
    "",
    "## Verification Checklist",
    "Provide 3-5 brief, testable bullet points the author should verify before merging.",
    "",
    "Rules: Be direct, accurate, and grounded strictly in the provided code. Never invent line numbers that do not exist. Never include filler greetings.",
  ].join("\n");
}

function formatLineNumberedCode(code: string): string {
  return code
    .split(/\r?\n/)
    .map((line, index) => `${String(index + 1).padStart(4, " ")} | ${line}`)
    .join("\n");
}

function extractReadableError(err: unknown): {
  status: number;
  message: string;
  code: string;
} {
  const rawMessage =
    err instanceof Error ? err.message : "Unexpected error while reviewing code.";
  const upper = rawMessage.toUpperCase();

  if (
    upper.includes("API_KEY_INVALID") ||
    upper.includes("PERMISSION_DENIED") ||
    upper.includes("403")
  ) {
    return {
      status: 403,
      code: "API_KEY_ERROR",
      message:
        "The Gemini API key appears invalid or lacks permission. Please verify the key in Settings > Secrets.",
    };
  }

  if (upper.includes("RESOURCE_EXHAUSTED") || upper.includes("429")) {
    return {
      status: 429,
      code: "RATE_LIMITED",
      message:
        "Rate limit or quota reached for the Gemini API. Please wait briefly or check your quota in Settings > Secrets.",
    };
  }

  if (upper.includes("NOT_FOUND") || upper.includes("404")) {
    return {
      status: 502,
      code: "MODEL_NOT_FOUND",
      message:
        "The configured Gemini model could not be reached. Please retry in a moment.",
    };
  }

  return {
    status: 500,
    code: "REVIEW_FAILED",
    message: rawMessage || "Failed to generate code review.",
  };
}

function sendSse(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post("/api/review", async (req: Request, res: Response) => {
    const body = req.body as {
      code?: unknown;
      language?: unknown;
      focus?: unknown;
    } | null;

    if (!body || typeof body.code !== "string") {
      res.status(400).json({
        error: "Code input is required and must be a string.",
        field: "code",
      });
      return;
    }

    const rawCode = body.code;
    const trimmed = rawCode.trim();

    if (trimmed.length === 0) {
      res.status(400).json({
        error: "Code input cannot be empty. Paste or load a snippet to review.",
        field: "code",
      });
      return;
    }

    if (trimmed.length < MIN_CODE_LENGTH) {
      res.status(400).json({
        error: `Code snippet is too short (${trimmed.length} chars). Provide at least ${MIN_CODE_LENGTH} characters for a meaningful review.`,
        field: "code",
      });
      return;
    }

    if (rawCode.length > MAX_CODE_LENGTH) {
      res.status(400).json({
        error: `Code snippet exceeds the ${MAX_CODE_LENGTH.toLocaleString()} character limit (${rawCode.length.toLocaleString()} chars provided).`,
        field: "code",
      });
      return;
    }

    const language =
      typeof body.language === "string" && ALLOWED_LANGUAGES.has(body.language)
        ? body.language
        : "auto";

    const focus =
      typeof body.focus === "string" && ALLOWED_FOCUSES.has(body.focus)
        ? body.focus
        : "full";

    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error:
          "Server Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets.",
        code: "MISSING_API_KEY",
      });
      return;
    }

    let clientAborted = false;
    res.on("close", () => {
      if (!res.writableFinished) {
        clientAborted = true;
      }
    });

    const lineCount = rawCode.split(/\r?\n/).length;
    const numberedCode = formatLineNumberedCode(rawCode);
    const systemInstruction = buildSystemInstruction(focus, language);

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    sendSse(res, "start", {
      model: "gemini-4-hydrogen",
      focus,
      language,
      lineCount,
      charCount: rawCode.length,
    });

    try {
      const ai = createGeminiClient();
      const stream = await ai.models.generateContentStream({
        model: "gemini-4-hydrogen",
        contents: [
          `Review the following ${language === "auto" ? "" : `${language} `}source code (${lineCount} lines, ${rawCode.length} characters). Line numbers are prepended on the left for reference only—do not include line number prefixes in your Refactored Code block.`,
          "",
          "```",
          numberedCode,
          "```",
        ].join("\n"),
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      for await (const chunk of stream) {
        if (clientAborted || res.writableEnded) {
          break;
        }
        const text = chunk.text;
        if (text) {
          sendSse(res, "chunk", { text });
        }
      }

      if (!clientAborted && !res.writableEnded) {
        sendSse(res, "done", { completedAt: new Date().toISOString() });
        res.end();
      }
    } catch (err) {
      if (!clientAborted && !res.writableEnded) {
        const mapped = extractReadableError(err);
        sendSse(res, "error", {
          message: mapped.message,
          code: mapped.code,
          status: mapped.status,
        });
        res.end();
      }
    }
  });

  app.get("/favicon.ico", (_req: Request, res: Response) => {
    res.status(204).end();
  });

  app.all("/api/*", (_req: Request, res: Response) => {
    res.status(404).json({ error: "API endpoint not found." });
  });

  const distPath = path.resolve(__dirname, "dist");
  const distIndexPath = path.join(distPath, "index.html");
  const shouldServeBuiltDist =
    process.env.NODE_ENV === "production" && fs.existsSync(distIndexPath);

  if (shouldServeBuiltDist) {
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(distIndexPath);
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IntelliFlow AI server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start IntelliFlow AI server:", err);
  process.exit(1);
});
