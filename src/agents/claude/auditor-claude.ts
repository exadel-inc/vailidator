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
      permissionMode: 'bypassPermissions', // auto-approves MCP tool calls too
      allowDangerouslySkipPermissions: true,
      maxTurns: 10,
      systemPrompt: SYSTEM_PROMPT,
      mcpServers: {
        [auditTools.name]: auditTools,
      },
    },
  });

  let finalText: string | undefined;

  for await (const message of stream) {
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

  if (finalText === undefined) {
    throw new Error('Claude agent returned no result message');
  }

  return parseLlmOutput(auditReportZodSchema, finalText);
};

export default runClaude;
