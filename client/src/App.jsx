import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

const MAX_INPUT_LENGTH = 20000;
const LANGUAGES = [
  { id: "auto", label: "Auto-detect" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "csharp", label: "C#" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "php", label: "PHP" },
  { id: "other", label: "Other" }
];
const REVIEW_FOCUSES = [
  { id: "balanced", label: "Balanced" },
  { id: "bugs", label: "Bugs" },
  { id: "security", label: "Security" },
  { id: "performance", label: "Performance" }
];

const EXAMPLE_CODE = `function getDisplayName(user) {
  if (!user) return "";
  return user.firstName + " " + user.lastName.trim();
}

function average(scores) {
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}`;

function readErrorMessage(payload) {
  return payload?.error || "Something went wrong. Please try again.";
}

export default function App() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("auto");
  const [focus, setFocus] = useState("balanced");
  const [review, setReview] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError("Paste code before starting a review.");
      return;
    }
    if (trimmedCode.length > MAX_INPUT_LENGTH) {
      setError(`Keep your code under ${MAX_INPUT_LENGTH.toLocaleString()} characters.`);
      return;
    }

    setError("");
    setReview("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode, language, focus })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(readErrorMessage(payload));
      }
      if (!response.body) {
        throw new Error("Streaming is unavailable in this browser. Please try another browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventName = "message";
      let dataLines = [];
      let receivedText = false;

      function dispatchEvent() {
        if (dataLines.length === 0) {
          eventName = "message";
          return;
        }
        const data = dataLines.join("\n");
        dataLines = [];
        const currentEvent = eventName;
        eventName = "message";
        const payload = JSON.parse(data);
        if (currentEvent === "error") {
          throw new Error(payload.error || "The code review stream ended unexpectedly.");
        }
        if (currentEvent === "delta" && typeof payload.text === "string") {
          receivedText = true;
          setReview((current) => current + payload.text);
        }
      }

      function consumeLine(line) {
        if (line === "") {
          dispatchEvent();
        } else if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
      }

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          consumeLine(line.endsWith("\r") ? line.slice(0, -1) : line);
        }
        if (done) {
          if (buffer) consumeLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
          dispatchEvent();
          break;
        }
      }
      if (!receivedText) {
        throw new Error("The review service returned an empty response. Please try again.");
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to reach the code review service. Please try again.");
      setReview("");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setCode("");
    setReview("");
    setError("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="CodeBench home">
          <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
          <span>CodeBench</span>
        </a>
        <span className="topbar-note"><span className="status-dot" /> AI CODE REVIEW</span>
      </header>

      <section className="intro">
        <div className="eyebrow"><span className="eyebrow-line" /> A SECOND SET OF EYES</div>
        <h1>Ship code with <span>confidence.</span></h1>
        <p>Paste a snippet, choose what to focus on, and get a thoughtful review before it ships.</p>
      </section>

      <section className="workspace" aria-label="Code review workspace">
        <form className="panel input-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <span className="step-label">01 / CODE INPUT</span>
              <h2>What should we review?</h2>
            </div>
            <button className="text-button" type="button" onClick={() => { setCode(EXAMPLE_CODE); setError(""); }}>
              Load example <span aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="editor-toolbar">
            <label htmlFor="language-select">LANGUAGE</label>
            <select id="language-select" value={language} onChange={(event) => setLanguage(event.target.value)}>
              {LANGUAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <span className="line-count">{code ? `${code.split("\n").length} lines` : "Paste or type code"}</span>
          </div>

          <label className="sr-only" htmlFor="source-code">Code to review</label>
          <textarea
            id="source-code"
            className="code-editor"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              if (error) setError("");
            }}
            maxLength={MAX_INPUT_LENGTH}
            placeholder={"// Paste a function, component, or snippet here...\n\n"}
            spellCheck="false"
            autoCapitalize="off"
            autoCorrect="off"
            aria-describedby="input-guidance character-count"
          />
          <div className="input-footer">
            <span id="input-guidance">Remove secrets first. Code is sent to your configured AI provider.</span>
            <span id="character-count" className={code.length > MAX_INPUT_LENGTH * 0.9 ? "count count-warning" : "count"}>
              {code.length.toLocaleString()} / {MAX_INPUT_LENGTH.toLocaleString()}
            </span>
          </div>

          <div className="focus-row">
            <span className="format-label">REVIEW FOCUS</span>
            <div className="focus-options" role="group" aria-label="Review focus">
              {REVIEW_FOCUSES.map((item) => (
                <button
                  className={`focus-button${focus === item.id ? " selected" : ""}`}
                  key={item.id}
                  type="button"
                  aria-pressed={focus === item.id}
                  onClick={() => setFocus(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button className="clear-button" type="button" onClick={handleClear} disabled={!code && !review && !error}>
              Clear
            </button>
          </div>

          {error && <p className="error-message" role="alert">{error}</p>}

          <button className="submit-button" type="submit" disabled={isLoading}>
            {isLoading ? (
              <><span className="spinner" aria-hidden="true" /> Reviewing code...</>
            ) : (
              <>Review code <span aria-hidden="true">→</span></>
            )}
          </button>
        </form>

        <section className="panel output-panel" aria-labelledby="review-heading">
          <div className="panel-heading output-heading">
            <div>
              <span className="step-label">02 / REVIEW RESULTS</span>
              <h2 id="review-heading">Code review</h2>
            </div>
            <span className="review-badge">STATIC REVIEW</span>
          </div>

          {review ? (
            <article className="review-content" aria-live="polite">
              <ReactMarkdown>{review}</ReactMarkdown>
              {isLoading && <span className="streaming-cursor" aria-label="Review is streaming" />}
            </article>
          ) : isLoading ? (
            <div className="empty-state loading-state" role="status" aria-live="polite">
              <span className="loading-orbit" aria-hidden="true"><span /></span>
              <h3>Reading through your code</h3>
              <p>Findings will appear here as the review is written.</p>
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">&lt;/&gt;</span>
              <h3>Ready when your code is.</h3>
              <p>Actionable findings, clear context, and practical next steps.</p>
            </div>
          )}

          <div className="output-footer">
            <span><span className="privacy-icon" aria-hidden="true">●</span> Your code is never executed</span>
            <span>Review, then verify.</span>
          </div>
        </section>
      </section>

      <footer className="page-footer">
        <span>Built for better code, one review at a time.</span>
        <span>AI-assisted. Human-approved.</span>
      </footer>
    </main>
  );
}
