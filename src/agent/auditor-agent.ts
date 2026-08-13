import { createOpenAI } from '@ai-sdk/openai';
import { ToolLoopAgent, isStepCount } from 'ai';
import { lighthouseAuditTool } from '../tools/lighthouse/lighthouse-tool.js';
import { linksCheckerTool } from '../tools/links-checker/links-checker-tool.js';
import { AuditReport, auditReportZodSchema } from './audit-report-zod-schema.js';
import SYSTEM_PROMPT from './system-prompt.js';

const provider = createOpenAI({
  baseURL: process.env.LLM_BASE_URL ?? 'http://localhost:1234/v1',
  apiKey: process.env.LLM_API_KEY ?? 'local',
});

const auditorAgent = new ToolLoopAgent({
  model: provider.chat(process.env.LLM_MODEL ?? 'your-model-id'),
  instructions: SYSTEM_PROMPT,
  // output: Output.json(),
  tools: {
    lighthouseAuditTool,
    linksCheckerTool,
  },
  stopWhen: isStepCount(10),
});

const runAgent = async (prompt: string): Promise<AuditReport> => {
  const result = await auditorAgent.generate({
    prompt: prompt,
  });

  let rawOutput: string;
  try {
    rawOutput = JSON.parse(result.output);
  } catch (error) {
    console.error('Agent returned non-JSON output:', result.output);
    throw new Error(
      `Agent returned non-JSON output: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return auditReportZodSchema.parse(rawOutput);
};


export default runAgent;
