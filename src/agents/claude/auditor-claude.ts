import { createSdkMcpServer, query } from '@anthropic-ai/claude-agent-sdk';
import { parseLlmOutput } from '../../helpers/response-parser.js';
import { auditReportZodSchema, AuditReport } from '../audit-report-zod-schema.js';
import SYSTEM_PROMPT from '../system-prompt.js';
import { claudeLighthouseAuditTool, claudeLinksCheckerTool } from './claude-tools.js';

const auditTools = createSdkMcpServer({
  name: 'audit-tools',
  version: '1.0.0',
  alwaysLoad: true, // keep both tools always in context, no deferred tool search
  tools: [
    claudeLighthouseAuditTool,
    claudeLinksCheckerTool,
  ],
});

const runClaude = async (prompt: string): Promise<AuditReport> => {
  const stream = query({
    prompt,
    options: {
      tools: [],
      allowedTools: [
        `mcp__${auditTools.name}__${claudeLighthouseAuditTool.name}`,
        `mcp__${auditTools.name}__${claudeLinksCheckerTool.name}`,
      ],
      permissionMode: "dontAsk", // Deny everything not approved instead of ask
      maxTurns: 10,
      systemPrompt: SYSTEM_PROMPT,
      mcpServers: {
        [auditTools.name]: auditTools,
      },
      includePartialMessages: true,
    },
  });

  let finalText: string | undefined;
  let streamedChars = 0;

  for await (const message of stream) {
    // Stream assistant text deltas to the node console as they are generated.
    if (message.type === 'stream_event' && message.event.type === 'content_block_delta') {
      const delta = message.event.delta;
      if (delta.type === 'text_delta') {
        process.stdout.write(delta.text);
        streamedChars += delta.text.length;
      }
    }

    if (message.type === 'result') {
      if (message.subtype === 'success') {
        finalText = message.result;
      } else {
        throw new Error(
          `Claude agent error (${message.subtype}): ${message.errors?.join('; ') ?? ''}`
        );
      }
    }
  }

  // Terminate the streamed line.
  if (streamedChars > 0) {
    process.stdout.write('\n');
  }

  if (finalText === undefined) {
    throw new Error('Claude agent returned no result message');
  }

  return parseLlmOutput(auditReportZodSchema, finalText);
};

export default runClaude;
