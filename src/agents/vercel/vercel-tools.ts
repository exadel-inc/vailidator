import { tool } from 'ai';
import { z } from 'zod';
import { runLighthouse, LIGHTHOUSE_DESCRIPTION } from '../../tools/lighthouse/lighthouse-runner.js';
import { linksChecker, LINKS_CHECKER_TOOL_DESCRIPTION } from '../../tools/links-checker/links-checker.js';

export const vercelLighthouseAuditTool = tool({
  description: LIGHTHOUSE_DESCRIPTION,
  inputSchema: z.object({
    markup: z.string(),
  }),
  execute: async ({ markup }) => {
    console.log('[agent] Running Lighthouse audit tool...')
    return await runLighthouse(markup);
  }
});

export const vercelLinksCheckerTool = tool({
  description: LINKS_CHECKER_TOOL_DESCRIPTION,
  inputSchema: z.object({
    links: z.array(z.string()),
    originalUrl: z.string().optional(),
  }),
  execute: async ({ links, originalUrl }) => {
    console.log('[agent] Running links checker tool...');
    return await linksChecker(links, originalUrl);
  }
});
