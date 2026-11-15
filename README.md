# CodeBench

A focused AI code reviewer built with React, Vite, and an Express backend. Paste a code snippet, choose a language and review focus, then get actionable findings as they stream in.

## Features

- Purpose-built code review flow with language selection and balanced, bug, security, and performance review focuses.
- Streaming Markdown findings with visible loading, validation, and provider error states.
- Defensive static review: submitted code is not executed, and the review prompt avoids exploit instructions.
- 20,000-character input limit enforced in both the browser and API.
- The LLM API key is read only by the backend; it is never sent to the browser.
- Responsive, white-and-black interface with no browser-side storage of submitted code.

## Run locally

1. Install Node.js 18 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` to your server-side API key. Optionally set `OPENAI_MODEL` (defaults to `gpt-4o-mini`).
4. Start the frontend and API with `npm run dev`, then open the Vite URL shown in the terminal (usually `http://localhost:5173`).

The development server proxies `/api` requests to Express on port 3001. The key must stay in `.env`; never add it to a `VITE_` variable. Remove credentials and other secrets from code before submitting it to the configured AI provider.

## Production and deployment

Run `npm run build`, then `npm start`. The Express server serves both the generated `dist` frontend and the streaming review API from the same origin. Set `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL` and `PORT` as environment variables in your hosting provider. A Node.js host such as Render or Railway can deploy this repository using `npm install`, `npm run build`, and `npm start`.

Before sharing a deployment, verify a valid review, an empty submission, and an API/provider error from the live URL. A public deployment requires a hosting account and a provider API key; those credentials are intentionally not stored in this repository.
