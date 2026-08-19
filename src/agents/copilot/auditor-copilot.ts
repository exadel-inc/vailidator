import { CopilotClient, approveAll, ToolSet } from "@github/copilot-sdk";
import { copilotLighthouseAudit, copilotCheckLinks } from './copilot-tools.js';
import { auditReportZodSchema, AuditReport } from '../audit-report-zod-schema.js';
import { parseLlmOutput } from '../../helpers/response-parser.js';
import SYSTEM_PROMPT from '../system-prompt.js';

const runCopilot = async (prompt: string): Promise<AuditReport> => {
  const client = new CopilotClient({
    gitHubToken: process.env.GITHUB_TOKEN || undefined,
  });

  const session = await client.createSession({
      model: "auto",
      systemMessage: {  
        content: SYSTEM_PROMPT,
      },
      onPermissionRequest: approveAll,
      tools: [copilotLighthouseAudit, copilotCheckLinks],
      availableTools: new ToolSet().addCustom("*")
    });

    const messageDeltaUnsubscribe = session.on("assistant.message_delta", (event) => {
      process.stdout.write(event.data.deltaContent);
    });

    const idleUnsubscribe = session.on("assistant.idle", (event) => {
      console.log('\n');
    });

  try {
    const response = await session.sendAndWait({ prompt }, 5 * 60 * 1000);

    if (!response) {
      throw new Error('Copilot returned no final message');
    }

    const finalText = response.data.content;

    return parseLlmOutput(auditReportZodSchema, finalText);
  } finally {
    messageDeltaUnsubscribe();
    idleUnsubscribe();
    await client.stop();
  }
};

export default runCopilot;
