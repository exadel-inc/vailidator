import { z } from 'zod';
import { runLighthouse, LIGHTHOUSE_DESCRIPTION, LIGHTHOUSE_TOOL_NAME } from '../tools/lighthouse/lighthouse-runner.js';
import { linksChecker, LINKS_CHECKER_TOOL_DESCRIPTION, LINKS_CHECKER_TOOL_NAME } from '../tools/links-checker/links-checker.js';
import { defineTool } from "@github/copilot-sdk";

export function buildLighthouseAuditTool(markup: string) {
  return defineTool(LIGHTHOUSE_TOOL_NAME, {
    description: LIGHTHOUSE_DESCRIPTION,
    skipPermission: true,
    defer: "never",
    handler: async () => {
      const result = await runLighthouse(markup);
      return JSON.stringify(result);
    },
  });
}

export function buildLinksCheckerTool(links: string[], originalUrl?: string) {
  return defineTool(LINKS_CHECKER_TOOL_NAME, {
    description: LINKS_CHECKER_TOOL_DESCRIPTION,
    skipPermission: true,
    defer: "never",
    handler: async () => {
      const result = await linksChecker(links, originalUrl);
      return JSON.stringify(result);
    },
  });
}
