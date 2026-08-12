import { linksChecker } from './links-checker.js'

import { tool } from 'ai';
import { z } from 'zod';

export const linksCheckerTool = tool({
  description: 'Run a link checker against a list of links urls. Use this when the user asks to check links, validate links, or verify links.',
  inputSchema: z.object({
    links: z.array(z.string()),
  }),
  execute: async ({ links }) => {
    console.log('[agent] Running links checker tool...')
    return await linksChecker(links);
  }
});
