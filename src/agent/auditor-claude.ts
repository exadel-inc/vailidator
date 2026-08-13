import { createSdkMcpServer, query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { runLighthouse } from '../tools/lighthouse/lighthouse-runner.js';
import { linksChecker } from '../tools/links-checker/links-checker.js';
import { auditReportZodSchema, AuditReport } from './audit-report-zod-schema.js';
import SYSTEM_PROMPT from './system-prompt.js';

const auditTools = createSdkMcpServer({
  name: 'audit-tools',
  version: '1.0.0',
  alwaysLoad: true, // keep both tools always in context, no deferred tool search
  tools: [
    {
      name: 'lighthouse_audit',
      description:
        'Run Lighthouse SEO and accessibility audits against supplied HTML markup. Returns JSON of failed audits.',
      inputSchema: { markup: z.string() },
      handler: async ({ markup }) => {
        const result = await runLighthouse(markup as string);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      },
    },
    {
      name: 'check_links',
      description:
        'Run a link checker against a list of link URLs. Returns JSON with HTTP status per URL.',
      inputSchema: { links: z.array(z.string()) },
      handler: async ({ links }) => {
        const result = await linksChecker(links as string[]);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      },
    },
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

  let rawOutput: unknown;
  try {
    rawOutput = JSON.parse(finalText);
  } catch (error) {
    console.error('Agent returned non-JSON output:', finalText);
    throw new Error(
      `Agent returned non-JSON output: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return auditReportZodSchema.parse(rawOutput);
};

export default runClaude;
