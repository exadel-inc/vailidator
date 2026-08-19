import { createOpenAI } from '@ai-sdk/openai';
import { ToolLoopAgent, isStepCount } from 'ai';
import { AuditReport, auditReportZodSchema } from '../audit-report-zod-schema.js';
import { parseLlmOutput } from '../../helpers/response-parser.js';
import { vercelLighthouseAuditTool, vercelLinksCheckerTool } from './vercel-tools.js';
import SYSTEM_PROMPT from '../system-prompt.js';

const provider = createOpenAI({
  baseURL: process.env.LLM_BASE_URL ?? 'http://localhost:1234/v1',
  apiKey: process.env.LLM_API_KEY ?? 'local',
});

const auditorAgent = new ToolLoopAgent({
  model: provider.chat(process.env.LLM_MODEL ?? 'your-model-id'),
  instructions: SYSTEM_PROMPT,
  tools: {
    vercelLighthouseAuditTool,
    vercelLinksCheckerTool,
  },
  stopWhen: isStepCount(10),
});

const runAgent = async (prompt: string): Promise<AuditReport> => {
  const result = await auditorAgent.stream({
    prompt: prompt,
  });

  // Stream the agent's text output to the node console as it is generated.
  let streamedChars = 0;
  for await (const delta of result.textStream) {
    process.stdout.write(delta);
    streamedChars += delta.length;
  }
  if (streamedChars > 0) {
    process.stdout.write('\n');
  }

  const finalText = await result.text;

  let rawOutput: unknown;
  try {
    rawOutput = JSON.parse(finalText);
  } catch (error) {
    console.error('Agent returned non-JSON output:', finalText);
    throw new Error(
      `Agent returned non-JSON output: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return parseLlmOutput(auditReportZodSchema, rawOutput);
};


export default runAgent;
