const express = require("express");
const path = require("node:path");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const MAX_INPUT_LENGTH = 20000;
const VALID_FORMATS = new Set(["paragraph", "bullets", "brief"]);

app.use(express.json({ limit: "100kb" }));
app.use((error, req, res, next) => {
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Request is too large. Keep your text under 20,000 characters." });
  }
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  next(error);
});

app.post("/api/summarize", async (req, res) => {
  const { text, format } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Add some text before generating a summary." });
  }
  if (text.trim().length > MAX_INPUT_LENGTH) {
    return res.status(400).json({ error: `Text must be ${MAX_INPUT_LENGTH.toLocaleString()} characters or fewer.` });
  }
  if (typeof format !== "string" || !VALID_FORMATS.has(format)) {
    return res.status(400).json({ error: "Choose a valid summary style." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "Summarization is not configured yet. Add an API key on the server and try again." });
  }

  const formatInstructions = {
    paragraph: "Write one clear, concise paragraph.",
    bullets: "Summarize as 3 to 6 concise bullet points.",
    brief: "Summarize in one sentence."
  };
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        stream: true,
        temperature: 0.3,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: `You are a precise text summarizer. ${formatInstructions[format]} Preserve important facts and do not add information not present in the source.`
          },
          { role: "user", content: text.trim() }
        ]
      })
    });
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error("Could not reach the LLM provider:", error.message);
    return res.status(502).json({ error: "Could not reach the summarization service. Please try again." });
  }

  if (!upstream.ok) {
    const providerMessage = await upstream.text();
    console.error(`LLM provider returned ${upstream.status}: ${providerMessage.slice(0, 500)}`);
    const status = upstream.status === 401 || upstream.status === 403 ? 503 : 502;
    const message = status === 503
      ? "The summarization service is not configured correctly. Please contact the site owner."
      : "The summarization service could not process your request. Please try again.";
    return res.status(status).json({ error: message });
  }
  if (!upstream.body) {
    return res.status(502).json({ error: "The summarization service returned an empty response." });
  }

  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });

  const sendEvent = (name, payload) => {
    res.write(`event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`);
  };
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let buffer = "";

  function processEvent(eventText) {
    const data = eventText
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return data === "[DONE]";
    const payload = JSON.parse(data);
    const delta = payload.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta) sendEvent("delta", { text: delta });
    if (payload.choices?.[0]?.finish_reason) return true;
    return false;
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let separator;
      while ((separator = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const eventText = buffer.slice(0, separator);
        const separatorLength = buffer.slice(separator).startsWith("\r\n\r\n") ? 4 : 2;
        buffer = buffer.slice(separator + separatorLength);
        if (processEvent(eventText)) {
          await reader.cancel();
          sendEvent("done", {});
          return res.end();
        }
      }
      if (done) break;
    }
    if (buffer.trim()) processEvent(buffer);
    sendEvent("done", {});
    return res.end();
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error("Error while streaming the summary:", error.message);
    if (!res.writableEnded) {
      sendEvent("error", { error: "The summary stream was interrupted. Please try again." });
      res.end();
    }
  } finally {
    reader.releaseLock();
  }
});

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"), (error) => {
    if (error && !res.headersSent) res.status(404).send("Application build not found. Run npm run build first.");
  });
});

app.listen(PORT, () => {
  console.log(`IntelliFlow server listening on port ${PORT}`);
});