import { z } from 'zod';
import { runLighthouse } from '../../tools/lighthouse/lighthouse-runner.js';
import { linksChecker } from '../../tools/links-checker/links-checker.js';
import { defineTool } from "@github/copilot-sdk";

export const copilotLighthouseAudit = defineTool("lighthouse_audit", {
  description:
    'Run Lighthouse SEO and accessibility audits against supplied HTML markup. Returns JSON of failed audits.',
  parameters: z.object({ markup: z.string() }),
  skipPermission: true,
  defer: "never",
  handler: async ({ markup }) => {
    const result = await runLighthouse(markup);
    return JSON.stringify(result);
  },
});

export const copilotCheckLinks = defineTool("check_links", {
  description:
    'Run a link checker against a list of link URLs, resolving relative links against the original page URL. Returns JSON with HTTP status per URL.',
  parameters: z.object({ links: z.array(z.string()), originalUrl: z.string().optional() }),
  skipPermission: true,
  defer: "never",
  handler: async ({ links, originalUrl }) => {
    const result = await linksChecker(links, originalUrl);
    return JSON.stringify(result);
  },
});
