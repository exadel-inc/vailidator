import { tool } from 'ai';
import { z } from 'zod';
import { runLighthouse } from '../../tools/lighthouse/lighthouse-runner.js';
import { linksChecker } from '../../tools/links-checker/links-checker.js';

export const vercelLighthouseAuditTool = tool({
  description: 'Run Lighthouse SEO and accessibility audits against supplied HTML. Use this when the user asks to audit, validate, or inspect a web page.',
  inputSchema: z.object({
    markup: z.string(),
  }),
  execute: async ({ markup }) => {
    console.log('[agent] Running Lighthouse audit tool...')
    return await runLighthouse(markup);
  }
});

export const vercelLinksCheckerTool = tool({
  description: 'Run a link checker against a list of links urls, resolving relative links against the original page URL. Use this when the user asks to check links, validate links, or verify links.',
  inputSchema: z.object({
    links: z.array(z.string()),
    originalUrl: z.string().optional(),
  }),
  execute: async ({ links, originalUrl }) => {
    console.log('[agent] Running links checker tool...');
    return await linksChecker(links, originalUrl);
  }
});
  