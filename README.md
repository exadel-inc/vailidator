# HTML Validation Server

An HTTP server that audits submitted HTML for SEO, accessibility, and custom validation rules. It drives a single **GitHub Copilot agent** that runs Lighthouse and link checks against the markup, evaluates the validation rules, and streams its progress to the browser in real time. The audit finishes with a validated JSON report that the browser client renders in a modal.

The repository also contains a browser client (Preact + Webpack) that injects an audit UI into an AEM preview page. It posts the rendered markup and rules to `POST /audit` and shows the agent's live log stream in a terminal-style panel while the audit runs.

## Model modes

The Copilot agent can run in two modes:

- **Built-in Copilot models** — the agent uses Copilot's own models. Pick one with `COPILOT_MODEL` (default `auto`). Requires Copilot authentication.
- **Custom LLM provider** — point the agent at any OpenAI-compatible endpoint (LM Studio, Ollama, llama.cpp, cloud) by setting `CUSTOM_PROVIDER_BASE_URL`, `CUSTOM_PROVIDER_API_KEY`, and `CUSTOM_PROVIDER_MODEL`.

## Requirements

- Node.js 20 or newer
- npm
- A Chromium-compatible browser environment for Puppeteer
- Copilot CLI installed and authenticated (built-in model mode), or credentials for a custom OpenAI-compatible endpoint

Puppeteer downloads a compatible browser during dependency installation unless it is already available in the local cache.

## Installing the Copilot CLI

```bash
npm install -g @github/copilot
copilot --version
```

Authenticate with your GitHub Copilot subscription:

```bash
copilot login       # GitHub OAuth with your Copilot subscription
# alternative: set GITHUB_TOKEN in .env
```

## Installation

```bash
npm install
cp .env.example .env
```

Edit `.env` with the model/provider you want to use.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port used by the HTTP server |
| `ENVIRONMENT` | `development` | When `development`, Lighthouse reports are also written to `reports/` |
| `COPILOT_MODEL` | `auto` | Copilot model for the agent (`auto` lets Copilot choose) |
| `AGENT_RETRIES` | `3` | Number of retries when the agent returns invalid LLM output (malformed JSON / schema mismatch) |
| `GITHUB_TOKEN` | *(unset)* | GitHub token for Copilot auth; omit to use `copilot login` |
| `CUSTOM_PROVIDER_BASE_URL` | *(unset)* | Base URL of a custom OpenAI-compatible LLM provider (set all three `CUSTOM_PROVIDER_*` vars to use it) |
| `CUSTOM_PROVIDER_API_KEY` | *(unset)* | API key for the custom provider |
| `CUSTOM_PROVIDER_MODEL` | *(unset)* | Model name for the custom provider |

The `.env` file is ignored by Git. Do not commit API keys or other credentials.

## Running

```bash
npm run dev     # build, then run with hot reload (server + client watcher)
npm run build   # compile server, build client bundle, run lint
npm run lint    # ESLint
npm start       # run dist/server.js after building
```

The server listens at `http://localhost:3000` by default.

### Choosing the model

Set `COPILOT_MODEL` in `.env` to use a specific built-in Copilot model (default `auto`):

```env
COPILOT_MODEL=auto
```

To use a custom LLM provider instead, set all three variables:

```env
CUSTOM_PROVIDER_BASE_URL=http://localhost:1234
CUSTOM_PROVIDER_API_KEY=local
CUSTOM_PROVIDER_MODEL=qwen/qwen3.5-9b
```

## API

### `GET /ui-assets/:asset`

Serves a compiled browser client asset from `dist-ui/`. For example:

```text
http://localhost:3000/ui-assets/loader.js
```

### `POST /audit`

Submit an HTML document, a page URL, and one or more plain-text validation rules as JSON.

Request:

```json
{
  "markup": "<!doctype html><html><head><title>Example</title></head><body><h1>Hello</h1></body></html>",
  "pageUrl": "https://example.com/page",
  "rules": [
    "Page must have a visible phone number",
    "Page must have a clear call to action"
  ]
}
```

The body must contain a non-empty `markup` string, a non-empty `pageUrl` string, and a non-empty array of strings `rules`. Invalid requests receive HTTP `400`.

**Response:** the endpoint responds as a Server-Sent Events (SSE) stream while the audit runs:

- `event: log` — `{ "level": "log" | "info" | "warn" | "error", "message": "..." }` — discrete progress logs from the server and agent.
- `event: delta` — `{ "level": "...", "content": "..." }` — streamed token content (the agent's message/reasoning deltas).
- `event: report` — `{ "report": { ... } }` — the final validated report JSON; the stream then closes.
- `event: error` — `{ "message": "..." }` — the audit failed; the stream closes.

The browser client consumes this stream directly; a raw `curl` call shows the SSE events rather than a plain HTML page.

## Audit flow

1. `POST /audit` opens an SSE stream for the request.
2. The markup, page URL, and validation rules are packed into a prompt.
3. `runCopilot(prompt)` runs the agent. It can call its audit tools:
   - `lighthouse` — runs Lighthouse (SEO + accessibility) via Puppeteer against a temporary local HTTP server.
   - `links_checker` — checks a list of URLs (HTTP reachability, mailto/tel syntax).
4. Agent events are streamed to the client: token deltas as `delta`, skills/tool invocations and usage as `log`.
5. The agent returns an `AuditReport` as JSON, validated against `auditReportZodSchema`.
6. The validated `AuditReport` JSON is sent as the final `report` event; the browser client renders it.
7. Temporary files, the local HTTP server, and the browser are cleaned up.

## Client

The browser client (`src/client`) is bundled with Webpack into `dist-ui/loader.js` and served at `/ui-assets/loader.js`. Load it on an AEM author page (or `public/test-page.html`) to get:

- An **Audit** dropdown button (Audit / Settings / Log).
- A terminal-style **log panel** that renders the streamed server + agent logs in real time.
- The final report is rendered in a large modal and can be reopened anytime via the dropdown's **Show Result** item.

`src/client/services/audit.ts` reads the SSE stream, `src/client/services/logs.ts` fans the events out to UI subscribers, and the `Logger` component renders them. `log` events are also mirrored to the browser's DevTools console.

## Project structure

```text
src/
  server.ts                      Express server, static files, POST /audit (SSE stream)
  agent/
    agent.ts                     Copilot agent runner (built-in models or custom provider)
    agent-tools.ts               Copilot tool definitions (lighthouse, links_checker)
    audit-report-zod-schema.ts   Zod schema + AuditReport type for agent output
    system-prompt.ts             System prompt for the agent
  client/
    loader.ts                    Browser bundle entry: injects the audit UI into AEM
    components/                  Preact UI components (App, Dropdown, Logger, Report, SettingsModal)
    services/                    audit.ts (SSE client), logs.ts (pub/sub), storage.ts (rules)
    declarations.d.ts            .less module type declarations
  helpers/
    response-parser.ts           parseLlmOutput() — cleanup + JSON.parse + zod validate
    stream.ts                    SSE helpers: clientLog / clientLogDelta / initStream / endStream / failStream
  middleware/
    access-control-headers.ts    CORS and OPTIONS response middleware
  tools/
    lighthouse/                  Temporary HTML server and Lighthouse runner (SEO + accessibility)
    links-checker/               Link checker implementation
  types/                         Shared TypeScript interfaces
skills/
  links-checker/                 Agent skill used by the links checker
public/                          Root static files (test page)
dist-ui/                         Webpack client bundle output (loader.js)
webpack.config.cjs               Browser client Webpack configuration
eslint.config.js                 ESLint flat configuration
.env.example                     Example environment configuration
```

## Client development

Build the browser client once with:

```bash
npm run build:client
```

Watch mode:

```bash
npm run dev:client
```

`npm run dev` runs Nodemon for the server and Webpack watch mode for the client, rebuilding `dist-ui/loader.js` whenever client sources change. Edit files under `src/client`; do not edit generated files in `dist-ui`.

## Troubleshooting

### Puppeteer cannot launch Chrome

Make sure the machine has a compatible Chrome or Chromium installation and that the process is allowed to launch a headless browser. The server includes `--no-sandbox` and `--disable-dev-shm-usage` launch arguments for common server environments.

### The Copilot agent reports "Not logged in"

The agent authenticates with `GITHUB_TOKEN` if it is set; otherwise it falls back to the OAuth login stored by `copilot login`. If you omit the token and get "Not logged in", run `copilot login` once in a terminal (same user account as the server).

### The custom provider is ignored

The custom provider is only used when all three variables are set: `CUSTOM_PROVIDER_BASE_URL`, `CUSTOM_PROVIDER_API_KEY`, and `CUSTOM_PROVIDER_MODEL`. Otherwise the agent falls back to built-in Copilot models.

### The server is using the wrong port

Set `PORT` in `.env`, for example:

```env
PORT=3011
```

## License

No license has been specified for this project.
