import { z } from "zod";
import { commonEnvSchema, portSchema, refuseDevSentinelsInProduction } from "../common.js";
import { loadEnvOnce } from "../loader.js";
import { zodErrorToConfigError } from "../format.js";

/**
 * Environment schema for `services/mcp` (Model Context Protocol server).
 *
 * Architecture refs:
 * - arch §8.4 / §7.2 MCP server exposes adapter-backed tools
 */
export const mcpEnvSchema = refuseDevSentinelsInProduction(
  commonEnvSchema.extend({
    MCP_PORT: portSchema.default(3100),
    MCP_PUBLIC_URL: z.string().url().default("http://localhost:3100"),
    API_PUBLIC_URL: z.string().url().default("http://localhost:3001"),
    OLLAMA_HOST: z.string().url().optional(),
  }),
);

export type McpConfig = z.infer<typeof mcpEnvSchema>;

export function parseMcpEnv(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const result = mcpEnvSchema.safeParse(env);
  if (!result.success) {
    throw zodErrorToConfigError("mcp", result.error);
  }
  return Object.freeze(result.data) as McpConfig;
}

export function loadMcpConfig(): McpConfig {
  loadEnvOnce();
  return parseMcpEnv(process.env);
}
