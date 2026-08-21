import type { SdkMcpToolDefinition } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { runLighthouse, LIGHTHOUSE_DESCRIPTION } from '../../tools/lighthouse/lighthouse-runner.js';
import { linksChecker, LINKS_CHECKER_TOOL_DESCRIPTION, LINKS_CHECKER_TOOL_NAME} from '../../tools/links-checker/links-checker.js';

export const claudeLighthouseAuditTool: SdkMcpToolDefinition<{ markup: z.ZodString }> = {
  name: 'lighthouse_audit',
  description: LIGHTHOUSE_DESCRIPTION,
  inputSchema: { markup: z.string() },
  handler: async ({ markup }) => {
    const result = await runLighthouse(markup);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
};

export const claudeLinksCheckerTool: SdkMcpToolDefinition<{ links: z.ZodArray<z.ZodString>, originalUrl: z.ZodOptional<z.ZodString> }> = {
  name: LINKS_CHECKER_TOOL_NAME,
  description: LINKS_CHECKER_TOOL_DESCRIPTION,
  inputSchema: { links: z.array(z.string()), originalUrl: z.string().optional() },
  handler: async ({ links, originalUrl }) => {
    const result = await linksChecker(links, originalUrl);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
};
