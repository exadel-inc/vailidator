# HTML Validation Server

An HTTP server that audits submitted HTML for SEO, accessibility, and custom validation rules. It runs Lighthouse against the markup, sends the Lighthouse findings and rules to an LLM **agent**, and returns a self-contained HTML report.

The server supports three interchangeable auditors, selected with the `AUDITOR` environment variable:
- `claude` (default) — Claude Agent SDK, runs the locally installed `claude` CLI.
- `native` — AI SDK `ToolLoopAgent` over any OpenAI-compatible endpoint (LM Studio / Ollama / llama.cpp / cloud).
- `copilot` — GitHub Copilot SDK, drives the locally installed Copilot CLI.

## Requirements

- Node.js 20 or newer
- npm
- A Chromium-compatible browser environment for Puppeteer
- For the `native` auditor: an OpenAI-compatible chat completions endpoint (LM Studio, Ollama, llama.cpp, or a hosted provider)
- For the `claude` auditor: the `claude` CLI installed and authenticated (via `ANTHROPIC_API_KEY` or `claude login`)
- For the `copilot` auditor: the `copilot` CLI installed and authenticated (via `GITHUB_TOKEN` or `copilot login`)

Puppeteer downloads a compatible browser during dependency installation unless it is already available in the local cache. In restricted environments, make sure Chrome or Chromium is available and Puppeteer can launch it.

## Installing the agent CLIs

The `claude` and `copilot` auditors drive locally installed CLI tools. Install them globally with npm and log in once.

### Claude Code (`claude`)

```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

Authenticate — either with your Claude subscription or with an API key:

```bash
claude login        # browser-based OAuth with your claude.ai account (Pro/Max subscription)
# alternative: set ANTHROPIC_API_KEY in .env for pay-as-you-go Anthropic Console credits
```

### Copilot CLI (`copilot`)

```bash
npm install -g @github/copilot
copilot --version
```

Authenticate — either with your GitHub Copilot subscription or with a token:

```bash
copilot login       # GitHub OAuth with your Copilot subscription
# alternative: set GITHUB_TOKEN in .env
```

## Installation

```bash
npm install
cp .env.example .env
```

Edit `.env` with the LLM endpoint and model you want to use.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port used by the HTTP server |
| `ENVIRONMENT` | `development` | When set to `development`, failed Lighthouse audits are also written to `reports/` |
| `AUDITOR` | `claude` | Which agent runs audits: `claude` (Claude Agent SDK), `vercel` (AI SDK ToolLoopAgent), or `copilot` (GitHub Copilot SDK) |
| `LLM_BASE_URL` | `http://localhost:1234/v1` | Base URL for an OpenAI-compatible API (vercel auditor) |
| `LLM_API_KEY` | `local` | API key sent to the LLM provider (vercel auditor) |
| `LLM_MODEL` | `model-name` | Model name passed to the chat completions API (vercel auditor) |
| `ANTHROPIC_API_KEY` | *(unset)* | API key for the Claude auditor (Anthropic Console credits); omit to use the `claude login` subscription |
| `GITHUB_TOKEN` | *(unset)* | GitHub token for the Copilot auditor; omit to use the `copilot login` subscription |

The `.env` file is ignored by Git. Do not commit API keys or other credentials.

## Running

Start the development server with automatic reloads:

```bash
npm run dev
```

Build the TypeScript source:

```bash
npm run build
```

Run the compiled server:

```bash
npm start
```

Run ESLint:

```bash
npm run lint
```

The server listens at `http://localhost:3000` by default.

### Choosing an auditor

Set `AUDITOR` in `.env` or the environment to pick the agent implementation:

```bash
AUDITOR=vercel npm run dev    # AI SDK ToolLoopAgent + LLM_BASE_URL endpoint
AUDITOR=claude npm run dev    # Claude Agent SDK + local claude CLI (default)
AUDITOR=copilot npm run dev   # GitHub Copilot SDK + local copilot CLI
```

## Authentication

Each agent CLI must be logged in before it can be used:

- **Claude (`claude`)** — run `claude login` in a terminal to authenticate with your Claude subscription. Alternatively, set `ANTHROPIC_API_KEY` in `.env` to use pay-as-you-go Anthropic Console credits instead.
- **Copilot (`copilot`)** — run `copilot login` in a terminal to authenticate with your GitHub Copilot subscription. Alternatively, set `GITHUB_TOKEN` in `.env`.
- **Vercel (`vercel`)** — no login needed; it uses the `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` endpoint directly.

## API

### `POST /audit`

Submit an HTML document and one or more plain-text validation rules as JSON.

Request:

```json
{
  "markup": "<!doctype html><html><head><title>Example</title></head><body><h1>Hello</h1></body></html>",
  "rules": [
    "Page must have a visible phone number",
    "Page must have a clear call to action"
  ]
}
```

Example with `curl`:

```bash
curl --location 'http://localhost:3011/audit' \
--header 'Content-Type: application/json' \
--data '{
  "markup": "<!doctype html><html><head><title>Example</title></head><body><h1>Hello</h1><p>Some content</p><h2>Subtitle</h2></body></html>",
  "rules": [
    "Page must have a visible Hero banner with a headline and a call-to-action button",
    "Page must display a visible phone number",
    "Page must have a Privacy Policy link in the footer",
    "Should have a valid heading structure (h1, h2, h3) and semantic HTML elements"
  ]
}'
```

The request body must contain a non-empty string `markup` and a non-empty array of strings called `rules`. Invalid requests receive HTTP `400`. Errors during Lighthouse or LLM processing receive HTTP `500` with an HTML error page.

## Audit flow

1. The submitted markup and validation rules are packed into a prompt.
2. The auditor is resolved from the `AUDITOR` environment variable.
3. The selected agent inspects the markup and calls its audit tools:
   - `lighthouse_audit` — runs Lighthouse (SEO + accessibility) via Puppeteer against a temporary local HTTP server.
   - `check_links` — runs the link checker over a list of URLs.
4. The agent returns an `AuditReport` as JSON, which is validated against `auditReportZodSchema`.
5. `/audit` renders the result as a self-contained HTML report; `/agent` returns the raw JSON.
6. Temporary files, the local HTTP server, and the browser are cleaned up.

## Project structure

```text
src/
  server.ts                      Express server, POST /audit + POST /agent endpoints
  agents/
    index.ts                     Auditor factory keyed on the AUDITOR env var
    audit-report-zod-schema.ts   Zod schema + AuditReport type for LLM output
    system-prompt.ts             Shared system prompt for all auditors
    claude/
      auditor-claude.ts          Claude Agent SDK runner (local claude CLI + MCP tools)
      claude-tools.ts            MCP tool definitions for the Claude auditor
    copilot/
      auditor-copilot.ts         GitHub Copilot SDK runner (local copilot CLI)
      copilot-tools.ts           defineTool definitions for the Copilot auditor
    vercel/
      auditor-vercel.ts          AI SDK ToolLoopAgent (OpenAI-compatible endpoint)
      vercel-tools.ts            AI SDK tool() definitions for the Vercel auditor
  helpers/
    response-parser.ts           parseLlmOutput() — cleanup + JSON.parse + zod validate
  tools/
    lighthouse/lighthouse-runner.ts   Temporary HTML server and Lighthouse runner
    links-checker/links-checker.ts    Link checker implementation
  report/generator.ts           Self-contained HTML report generator
  types/                        Shared TypeScript interfaces
eslint.config.js                 ESLint flat configuration
.env.example                     Example environment configuration
```

## Troubleshooting

### Puppeteer cannot launch Chrome

Make sure the machine has a compatible Chrome or Chromium installation and that the process is allowed to launch a headless browser. The server includes `--no-sandbox` and `--disable-dev-shm-usage` launch arguments for common server environments.

### The LLM request fails

Check that `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` match the configured provider. The endpoint must support OpenAI-compatible chat completions and structured JSON responses.

### The Claude auditor reports "Not logged in"

The `claude` auditor authenticates with `ANTHROPIC_API_KEY` if it is set; otherwise it falls back to the OAuth login stored by `claude login`. If you omit the API key and get "Not logged in · Please run /login", run `claude login` once in a terminal (same user account as the server).

### Billing for the Claude auditor

With `ANTHROPIC_API_KEY` set, Claude Code bills through the Anthropic Console (pay-as-you-go). Without it, the auditor uses your `claude login` subscription. The CLI prefers an API key over the subscription whenever one is present in the environment.

### The Copilot auditor reports "Not logged in"

The `copilot` auditor authenticates with `GITHUB_TOKEN` if it is set; otherwise it falls back to the OAuth login stored by `copilot login`. If you omit the token and get "Not logged in", run `copilot login` once in a terminal (same user account as the server).

### The server is using the wrong port

Set `PORT` in `.env`, for example:

```env
PORT=3011
```

## License

No license has been specified for this project.
