import { CopilotClient, approveAll, ToolSet, SessionConfig, ProviderConfig } from "@github/copilot-sdk";
import { buildLighthouseAuditTool, buildLinksCheckerTool } from './agent-tools.js';
import { extractLinksFromMarkup } from '../tools/links-checker/links-checker.js';
import { auditReportZodSchema, AuditReport } from './audit-report-zod-schema.js';
import { parseLlmOutput, isInvalidLlmOutput } from '../helpers/response-parser.js';
import { clientLog, createDeltaLogger } from '../helpers/stream.js';
import SYSTEM_PROMPT from './system-prompt.js';
import type { AgentRequestData } from '../types/agent-request.types.js';

const MODEL = process.env.COPILOT_MODEL || "auto";
const REASONING_EFFORT = "high"; 
// How many times to re-run the agent when it returns invalid LLM output
// (e.g. malformed JSON or a schema mismatch). Default 3 retries.
const configuredRetries = Number(process.env.AGENT_RETRIES ?? 3);
const MAX_RETRIES = Number.isNaN(configuredRetries) ? 3 : Math.max(0, configuredRetries);

let lastEventType: string = '';
const isCustomProvider = process.env.CUSTOM_PROVIDER_BASE_URL && process.env.CUSTOM_PROVIDER_API_KEY && process.env.CUSTOM_PROVIDER_MODEL;

const sessionConfig: SessionConfig = {
  model: MODEL,
  workingDirectory: process.cwd(),
  systemMessage: {  
    content: SYSTEM_PROMPT,
  },
  skillDirectories: [
    "./skills",
  ],
  onPermissionRequest: approveAll,
  availableTools: new ToolSet().addCustom("*")
}

if (isCustomProvider) {
  const provider: ProviderConfig = {
    baseUrl: process.env.CUSTOM_PROVIDER_BASE_URL || "http://localhost:1234",
    apiKey: process.env.CUSTOM_PROVIDER_API_KEY,
  };

  sessionConfig.provider = provider;
  sessionConfig.model = process.env.CUSTOM_PROVIDER_MODEL;
}

if (MODEL !== "auto") sessionConfig.reasoningEffort = REASONING_EFFORT;

const usage = {
  model: MODEL,
  reasoningEffort: REASONING_EFFORT,
  inputTokens: 0,
  outputTokens: 0,
  cost: 0
}

function logSessionEvent(eventType: string, logEvent: () => void) {
  if (lastEventType !== eventType) clientLog(`\n`);
  logEvent();
  lastEventType = eventType;
}

function cancelled(): Error {
  const err = new Error('Audit cancelled');
  err.name = 'AbortError';
  return err;
}

// Runs one full audit attempt with its own client and session.
const runCopilotOnce = async (agentRequestData: AgentRequestData, signal?: AbortSignal): Promise<AuditReport> => {
  const client = new CopilotClient({
    sessionIdleTimeoutSeconds: 60 * 10,
    gitHubToken: process.env.GITHUB_TOKEN || undefined,
  });

  const { markup, rules, pageUrl } = agentRequestData;
  const prompt = `Validate the following HTML markup with the provided validation rules. Take into account that page url: <page_url>${pageUrl}</page_url>\n\n<html_markup>:\n${markup}\n</html_markup>\n<validation_rules>:\n${rules.join('\n')}\n</validation_rules>`;

  sessionConfig.tools = [
    buildLighthouseAuditTool(markup),
    buildLinksCheckerTool(extractLinksFromMarkup(markup), pageUrl),
  ];

  const session = await client.createSession(sessionConfig);
  const streamMessageDeltas = createDeltaLogger();
  const unsubscribe: Array<() => void> = [];

  const onAbort = () => {
    session.abort().catch(() => {});
  };
  
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  unsubscribe.push(session.on("assistant.message_delta", (event) => {
    process.stdout.write(event.data.deltaContent);
    logSessionEvent(event.type, () => streamMessageDeltas.push(event.data.deltaContent, 'info'));
  }));

  unsubscribe.push(session.on("assistant.reasoning_delta", (event) => {
    process.stdout.write(event.data.deltaContent);
    logSessionEvent(event.type, () => streamMessageDeltas.push(event.data.deltaContent, 'info'));
  }));

  unsubscribe.push(session.on("session.skills_loaded", (event) => {
    logSessionEvent(event.type, () => clientLog('Skills loaded:', 'info'));
    event.data.skills.forEach((skill: any) => {
      logSessionEvent(event.type, () => clientLog(`${skill.name}`, 'info'));
    });
  }));

  unsubscribe.push(session.on("skill.invoked", (event) => {
    logSessionEvent(event.type, () => clientLog(`Skill invoked ${event.data.name}`, 'info'));
  }));

  unsubscribe.push(session.on("tool.execution_start", (event) => {
    logSessionEvent(event.type, () => clientLog(`Agent is using tool ${event.data.toolName}`, 'info'));
  }));

  unsubscribe.push(session.on("tool.execution_progress", (event) => {
    logSessionEvent(event.type, () => clientLog(`Tool progress: ${event.data.progressMessage}`, 'info'));
  }));

  unsubscribe.push(session.on("session.error", (event) => {
    logSessionEvent(event.type, () => clientLog(`Agent session error: ${event.data.message}`, 'warn'));
  }));

  unsubscribe.push(session.on("assistant.usage", (event) => {
    const { inputTokens, outputTokens, cost, model  } = event.data;
    usage.model = model || usage.model;
    usage.inputTokens += (inputTokens || 0);
    usage.outputTokens += (outputTokens || 0);
    usage.cost += (cost || 0);
  }));

  try {
    // Settle immediately if the caller aborts so we don't hang on disconnect.
    const sendPromise = session.sendAndWait({ prompt }, 5 * 60 * 1000);
    const abortPromise = signal
      ? new Promise<never>((_, reject) => {
          if (signal.aborted) reject(cancelled());
          else signal.addEventListener('abort', () => reject(cancelled()), { once: true });
        })
      : null;

    const response = abortPromise ? await Promise.race([sendPromise, abortPromise]) : await sendPromise;
    if (!response) throw new Error('Copilot returned no final message');

    return parseLlmOutput(auditReportZodSchema, response.data.content);
  } finally {
    if (signal) signal.removeEventListener('abort', onAbort);
    unsubscribe.forEach(u => u());
    streamMessageDeltas.flush();
    await client.stop();
  }
};

// Runs the agent, retrying when the LLM output is invalid.
const runCopilot = async (agentRequestData: AgentRequestData, signal?: AbortSignal): Promise<AuditReport> => {
  const maxAttempts = MAX_RETRIES + 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const report = await runCopilotOnce(agentRequestData, signal);

      clientLog(`\nTotal usage:`);
      clientLog(`Input tokens: ${usage.inputTokens}`);
      clientLog(`Output tokens: ${usage.outputTokens}`);
      clientLog(`Cost: ${usage.cost}\n\n`);

      return report;
    } catch (err) {
      if (!isInvalidLlmOutput(err)) throw err;

      lastError = err as Error;
      if (attempt < maxAttempts) {
        clientLog(`LLM returned invalid output on attempt ${attempt}/${maxAttempts}; retrying...`, 'warn');
      } else {
        clientLog(`LLM returned invalid output after ${maxAttempts} attempts`, 'error');
      }
    }
  }

  throw lastError ?? new Error('Copilot failed after exhausting retries');
};

export default runCopilot;
