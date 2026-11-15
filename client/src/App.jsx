import React, { useState } from "react";

const MAX_INPUT_LENGTH = 20000;
const FORMATS = [
  { id: "paragraph", label: "Paragraph" },
  { id: "bullets", label: "Key points" },
  { id: "brief", label: "One-liner" }
];

const EXAMPLE_TEXT = `The city council has approved a $12 million plan to expand the public library network over the next three years. The proposal includes renovating two existing branches, opening a new location in the growing east district, and extending weekend hours at all six libraries. Funding will come from a combination of municipal bonds and a state grant announced last month.

The expansion follows a year-long community consultation that gathered more than 4,000 responses. Residents consistently asked for more study spaces, reliable internet access, and programs for children and older adults. In response, the new branch will include a digital learning lab, while each renovated location will add quiet rooms and updated accessibility features.

Construction on the east district branch is expected to begin in spring 2027, with the first renovation starting later this year. Officials estimate the changes will increase annual visits by 30 percent and create 45 full-time jobs. The council will review progress and spending every six months.`;

function readErrorMessage(payload) {
  return payload?.error || "Something went wrong. Please try again.";
}

export default function App() {
  const [text, setText] = useState("");
  const [format, setFormat] = useState("paragraph");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) {
      setError("Add some text before generating a summary.");
      return;
    }
    if (trimmedText.length > MAX_INPUT_LENGTH) {
      setError(`Keep your text under ${MAX_INPUT_LENGTH.toLocaleString()} characters.`);
      return;
    }

    setError("");
    setSummary("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmedText, format })
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
          throw new Error(payload.error || "The summary stream ended unexpectedly.");
        }
        if (currentEvent === "delta") {
          setSummary((current) => current + payload.text);
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
    } catch (requestError) {
      setError(requestError.message || "Unable to reach the summarizer. Please try again.");
      setSummary("");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setText("");
    setSummary("");
    setError("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="IntelliFlow home">
          <span className="brand-mark" aria-hidden="true">i</span>
          <span>intelliflow</span>
        </a>
        <span className="topbar-note"><span className="status-dot" /> Your thoughtful reading companion</span>
      </header>

      <section className="intro">
        <div className="eyebrow"><span className="eyebrow-line" /> LESS SCROLLING, MORE KNOWING</div>
        <h1>Make room for <span>the point.</span></h1>
        <p>Drop in an article, meeting notes, or a long read. Get the useful bits, without the extra noise.</p>
      </section>

      <section className="workspace" aria-label="Text summarizer">
        <form className="panel input-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <span className="step-label">01 / YOUR TEXT</span>
              <h2>What are we reading?</h2>
            </div>
            <button className="text-button" type="button" onClick={() => setText(EXAMPLE_TEXT)}>
              Try an example <span aria-hidden="true">↗</span>
            </button>
          </div>

          <label className="sr-only" htmlFor="source-text">Text to summarize</label>
          <textarea
            id="source-text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError("");
            }}
            maxLength={MAX_INPUT_LENGTH}
            placeholder="Paste an article, notes, or anything you want to understand faster..."
            aria-describedby="input-guidance character-count"
          />
          <div className="input-footer">
            <span id="input-guidance">Your text stays yours. We only use it to create this summary.</span>
            <span id="character-count" className={text.length > MAX_INPUT_LENGTH * 0.9 ? "count count-warning" : "count"}>
              {text.length.toLocaleString()} / {MAX_INPUT_LENGTH.toLocaleString()}
            </span>
          </div>

          <div className="format-row">
            <span className="format-label">GIVE ME</span>
            <div className="format-options" role="group" aria-label="Summary style">
              {FORMATS.map((item) => (
                <button
                  className={`format-button${format === item.id ? " selected" : ""}`}
                  key={item.id}
                  type="button"
                  aria-pressed={format === item.id}
                  onClick={() => setFormat(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button className="clear-button" type="button" onClick={handleClear} disabled={!text && !summary && !error}>
              Clear
            </button>
          </div>

          {error && <p className="error-message" role="alert">{error}</p>}

          <button className="submit-button" type="submit" disabled={isLoading}>
            {isLoading ? (
              <><span className="spinner" aria-hidden="true" /> Finding the signal...</>
            ) : (
              <>Summarize this <span aria-hidden="true">→</span></>
            )}
          </button>
        </form>

        <section className="panel output-panel" aria-labelledby="summary-heading">
          <div className="panel-heading output-heading">
            <div>
              <span className="step-label">02 / THE TAKEAWAY</span>
              <h2 id="summary-heading">Your clear view</h2>
            </div>
            <span className="sparkle" aria-hidden="true">✳</span>
          </div>

          {summary ? (
            <div className="summary-content" aria-live="polite">
              <p>{summary}</p>
              {isLoading && <span className="streaming-cursor" aria-label="Summary is streaming" />}
            </div>
          ) : isLoading ? (
            <div className="empty-state loading-state" role="status" aria-live="polite">
              <span className="loading-orbit" aria-hidden="true"><span /></span>
              <h3>Finding the signal</h3>
              <p>Your summary will appear here as it’s written.</p>
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">✳</span>
              <h3>A little clarity is on its way.</h3>
              <p>Your summary will show up here, ready to read and easy to keep.</p>
            </div>
          )}

          <div className="output-footer">
            <span><span className="privacy-icon" aria-hidden="true">◈</span> Made for your focus</span>
            <span>Thoughtful, not wordy.</span>
          </div>
        </section>
      </section>

      <footer className="page-footer">
        <span>Good ideas deserve to be understood.</span>
        <span>Take a breath. Get the gist.</span>
      </footer>
    </main>
  );
}