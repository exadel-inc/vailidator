import { tool } from 'ai';
import { z } from 'zod';
import { runLighthouse } from './lighthouse-runner.js';

export const lighthouseAuditTool = tool({
  description: 'Run Lighthouse SEO and accessibility audits against supplied HTML. Use this when the user asks to audit, validate, or inspect a web page.',
  inputSchema: z.object({
    markup: z.string(),
  }),
  execute: async ({ markup }) => {
    console.log('[agent] Running Lighthouse audit tool...')
    return await runLighthouse(markup);
  }
});
