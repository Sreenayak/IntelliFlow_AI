# CodeBench

CodeBench is a full-stack AI code review application that lets developers paste or upload a code snippet, choose a review focus, and receive a structured engineering review in real time. The app combines a React + Vite frontend with an Express backend and a Google Gemini model to stream findings as Markdown.

This project is designed for quick review workflows: it validates input before sending to the backend, enforces safe static analysis patterns, and presents findings in a clean, developer-friendly interface.

## Overview

The application is built around a simple idea:

- the user enters code or loads a sample snippet
- the UI selects a review angle such as security, bugs, performance, or full audit
- the backend validates the request and calls the Gemini API
- the model returns a structured review as a streaming response
- the frontend renders the generated Markdown results in the review panel

The system is intentionally conservative: it does not execute user code, keeps the API key on the server, and uses a strict prompt format so the model produces a predictable review structure.

## Features

- Streaming AI review output in Markdown format
- Review modes for full audit, security, performance, bug detection, and clean code
- Language detection and language selection for TypeScript, JavaScript, Python, Go, Rust, Java, SQL, and other code samples
- Input validation and length limits for safer review requests
- File upload support for common source code file types
- Sample snippets for quick testing and demonstrations
- Local conversation-like review history stored in the browser
- Dark and light theme support
- Server-side API key handling to avoid exposing secrets in the browser

## Tech Stack

- React 19 for the frontend UI
- Vite for fast local development and production builds
- TypeScript for type-safe code
- Express for the API layer
- Google GenAI SDK for model access
- Tailwind CSS for styling
- Lucide icons and custom CSS icon primitives for the UI

## Project Architecture

The app has two main layers:

1. Frontend (React + Vite)
   - handles editing, validation, sample selection, review controls, and rendering of Markdown results
2. Backend (Express + Gemini)
   - validates incoming requests
   - formats a structured system instruction for the review model
   - streams the model output back to the browser through Server-Sent Events

This architecture keeps the secret key out of the client and allows the interface to respond to long-running LLM output without blocking the browser.

## Prerequisites

- Node.js 18 or newer
- npm
- A valid Google Gemini API key

## Environment Setup

Create a `.env` file in the project root using the environment variables required by the current backend implementation.

Example:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

Important:

- The code in `server.ts` reads `GEMINI_API_KEY` from the environment.
- The repository's `.env.example` still contains older `OPENAI_*` variables and should be updated or replaced to match the current implementation.
- Do not expose the API key in the frontend or client code.

## Installation

```bash
npm install
```

## Running the App

### Development mode

```bash
npm run dev
```

This command starts the Express server through `tsx` and serves the Vite app in development mode. Open the URL shown in the terminal, typically:

```bash
http://localhost:5173
```

### Production build

```bash
npm run build
npm start
```

The production server serves the built frontend and the API from the same Node process.

## Available Scripts

```bash
npm run dev      # start the Express + Vite development setup
npm run build    # build the frontend for production
npm run preview  # preview the Vite production build
npm run start    # run the production server
npm run lint     # TypeScript type-check (`tsc --noEmit`)
```

## How It Works

### Frontend flow

- The user writes or uploads code in the editor panel.
- A review focus is selected from options like Security or Full Audit.
- The app validates the snippet length and format.
- A POST request is sent to `/api/review`.

### Backend flow

- Express receives the request and validates the code payload.
- The request is checked against strict limits.
- The backend builds a system message with the selected focus and language.
- It calls the Gemini API using `generateContentStream`.
- The response is sent back to the client with SSE chunks using `text/event-stream`.

### Review output

The model is instructed to return a structured Markdown review containing:

- a summary
- a findings section with severity levels
- a refactored code block
- a verification checklist

This makes the result easy to review and copy for follow-up engineering work.

## Security and Reliability Notes

- User code is not executed.
- Secrets stay server-side.
- The backend rejects empty or overly short snippets.
- Requests are limited to protect the API from abuse and excessive usage.
- Errors from the provider are mapped into readable messages for the UI.

## Project Structure

```text
IntelliFlow_AI/
├─ .env.example
├─ .gitignore
├─ README.md
├─ PROJECT_STRUCTURE.md
├─ index.html
├─ metadata.json
├─ package.json
├─ server.ts
├─ tsconfig.json
├─ vite.config.js
├─ dist/                     # generated build artifacts
├─ node_modules/             # installed dependencies
├─ src/
│  ├─ App.tsx
│  ├─ index.css
│  ├─ main.tsx
│  ├─ components/
│  │  ├─ ChecksGuideModal.tsx
│  │  ├─ CodeEditorPane.tsx
│  │  ├─ CssIcon.tsx
│  │  ├─ HistoryDrawer.tsx
│  │  └─ MarkdownReview.tsx
│  └─ data/
│     └─ samples.ts
└─ package-lock.json
```

For a more detailed breakdown of the purpose of each file, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

## License

This project does not currently declare a package license in `package.json`. If you intend to distribute or publish it, add an appropriate license file and update the project metadata.

## Notes

The application is currently named CodeBench in the codebase and UI, even though the repository folder is named IntelliFlow_AI. The project is a self-contained review tool and can be used as a starting point for AI-assisted engineering workflows, code quality automation, or developer productivity tooling.
