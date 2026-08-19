import type { SdkMcpToolDefinition } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { runLighthouse } from '../../tools/lighthouse/lighthouse-runner.js';
import { linksChecker } from '../../tools/links-checker/links-checker.js';

export const claudeLighthouseAuditTool: SdkMcpToolDefinition<{ markup: z.ZodString }> = {
  name: 'lighthouse_audit',
  description:
    'Run Lighthouse SEO and accessibility audits against supplied HTML markup. Returns JSON of failed audits.',
  inputSchema: { markup: z.string() },
  handler: async ({ markup }) => {
    const result = await runLighthouse(markup);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
};

export const claudeLinksCheckerTool: SdkMcpToolDefinition<{ links: z.ZodArray<z.ZodString>, originalUrl: z.ZodOptional<z.ZodString> }> = {
  name: 'check_links',
  description:
    'Run a link checker against a list of link URLs, resolving relative links against the original page URL. Returns JSON with HTTP status per URL.',
  inputSchema: { links: z.array(z.string()), originalUrl: z.string().optional() },
  handler: async ({ links, originalUrl }) => {
    const result = await linksChecker(links, originalUrl);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
};
