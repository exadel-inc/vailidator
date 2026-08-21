import { z } from 'zod';
import { runLighthouse, LIGHTHOUSE_DESCRIPTION } from '../../tools/lighthouse/lighthouse-runner.js';
import { linksChecker, LINKS_CHECKER_TOOL_DESCRIPTION, LINKS_CHECKER_TOOL_NAME } from '../../tools/links-checker/links-checker.js';
import { defineTool } from "@github/copilot-sdk";

export const copilotLighthouseAudit = defineTool("lighthouse_audit", {
  description: LIGHTHOUSE_DESCRIPTION,
  parameters: z.object({ markup: z.string() }),
  skipPermission: true,
  defer: "never",
  handler: async ({ markup }) => {
    const result = await runLighthouse(markup);
    return JSON.stringify(result);
  },
});

export const copilotCheckLinks = defineTool(LINKS_CHECKER_TOOL_NAME, {
  description: LINKS_CHECKER_TOOL_DESCRIPTION,
  parameters: z.object({ links: z.array(z.string()), originalUrl: z.string().optional() }),
  skipPermission: true,
  defer: "never",
  handler: async ({ links, originalUrl }) => {
    const result = await linksChecker(links, originalUrl);
    return JSON.stringify(result);
  },
});
