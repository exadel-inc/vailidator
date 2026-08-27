import { CopilotClient, approveAll, ToolSet, SessionConfig, ProviderConfig } from "@github/copilot-sdk";
import { copilotLighthouseAudit, copilotCheckLinks } from './agent-tools.js';
import { auditReportZodSchema, AuditReport } from './audit-report-zod-schema.js';
import { parseLlmOutput } from '../helpers/response-parser.js';
import { clientLog, createDeltaLogger } from '../helpers/stream.js';
import SYSTEM_PROMPT from './system-prompt.js';

const MODEL = process.env.COPILOT_MODEL || "auto";
const REASONING_EFFORT = "high"; 

let lastEventType: string = '';
const isCustomProvider = process.env.CUSTOM_PROVIDER_BASE_URL && process.env.CUSTOM_PROVIDER_API_KEY && process.env.CUSTOM_PROVIDER_MODEL;
const SessionEventsSubscriptions: Array<() => void> = [];

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
  tools: [copilotLighthouseAudit, copilotCheckLinks],
  availableTools: new ToolSet().addCustom("*")
}

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

const client = new CopilotClient({
  sessionIdleTimeoutSeconds: 60 * 10,
  gitHubToken: process.env.GITHUB_TOKEN || undefined,
});

const runCopilot = async (prompt: string): Promise<AuditReport> => {

  if (isCustomProvider) {
    const provider: ProviderConfig = {
      baseUrl: process.env.CUSTOM_PROVIDER_BASE_URL || "http://localhost:1234",
      apiKey: process.env.CUSTOM_PROVIDER_API_KEY,
    };

    sessionConfig.provider = provider;
    sessionConfig.model = process.env.CUSTOM_PROVIDER_MODEL;
  }

  if (MODEL !== "auto") sessionConfig.reasoningEffort = REASONING_EFFORT;

  const session = await client.createSession(sessionConfig);
  const streamMessageDeltas = createDeltaLogger();

  SessionEventsSubscriptions.push(session.on("assistant.message_delta", (event) => {
    process.stdout.write(event.data.deltaContent);
    logSessionEvent(event.type, () => streamMessageDeltas.push(event.data.deltaContent, 'info'));
  }));

  SessionEventsSubscriptions.push(session.on("assistant.reasoning_delta", (event) => {
    process.stdout.write(event.data.deltaContent);
    logSessionEvent(event.type, () => streamMessageDeltas.push(event.data.deltaContent, 'info'));
  }));

  SessionEventsSubscriptions.push(session.on("session.skills_loaded", (event) => {
    logSessionEvent(event.type, () => clientLog('Skills loaded:', 'info'));
    event.data.skills.forEach((skill: any) => {
      logSessionEvent(event.type, () => clientLog(`${skill.name}`, 'info'));
    });
  }));

  SessionEventsSubscriptions.push(session.on("skill.invoked", (event) => {
    logSessionEvent(event.type, () => clientLog(`Skill invoked ${event.data.name}`, 'info'));
  }));

  SessionEventsSubscriptions.push(session.on("tool.execution_start", (event) => {
    logSessionEvent(event.type, () => clientLog(`Agent is using tool ${event.data.toolName}`, 'info'));
  }));

  SessionEventsSubscriptions.push(session.on("tool.execution_progress", (event) => {
    logSessionEvent(event.type, () => clientLog(`Tool progress: ${event.data.progressMessage}`, 'info'));
  }));

  SessionEventsSubscriptions.push(session.on("assistant.usage", (event) => {
    const { inputTokens, outputTokens, cost, model  } = event.data;
    usage.model = model || usage.model;
    usage.inputTokens += (inputTokens || 0);
    usage.outputTokens += (outputTokens || 0);
    usage.cost += (cost || 0);
  }));

  try {
    const response = await session.sendAndWait({ prompt }, 5 * 60 * 1000);
    if (!response) throw new Error('Copilot returned no final message');

    return parseLlmOutput(auditReportZodSchema, response.data.content);
  } finally {
    SessionEventsSubscriptions.forEach(unsubscribe => unsubscribe());
    streamMessageDeltas.flush();
    await client.stop();

    clientLog(`\nTotal usage:`);
    clientLog(`Input tokens: ${usage.inputTokens}`);
    clientLog(`Output tokens: ${usage.outputTokens}`);
    clientLog(`Cost: ${usage.cost}\n\n`);
  }
};

export default runCopilot;
