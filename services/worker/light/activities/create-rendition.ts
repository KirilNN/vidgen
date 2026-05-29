/**
 * services/worker/light/activities/create-rendition — workflow-side
 * wrapper around the API's `/internal/renditions` endpoint (T-031).
 *
 * Wrapped as an activity so the workflow stays deterministic — only
 * activities are allowed to do I/O in a Temporal workflow.
 */
import { getInternalApiClient, type InternalApiClient } from "./api-client.js";

let apiClient: InternalApiClient | undefined;

/** @internal */
export function __setApiClientForTests(client: InternalApiClient | undefined): void {
  apiClient = client;
}

function getApi(): InternalApiClient {
  if (!apiClient) apiClient = getInternalApiClient();
  return apiClient;
}

export interface CreateRenditionInput {
  workspace_id: string;
  asset_id: string;
  /** "mezzanine" | "audio" | "thumb" | … */
  kind: string;
  uri: string;
  params_json?: Record<string, unknown>;
}

export interface CreateRenditionResult {
  rendition_id: string;
  asset_id: string;
  workspace_id: string;
  kind: string;
  uri: string;
}

export async function createRendition(input: CreateRenditionInput): Promise<CreateRenditionResult> {
  if (!input?.workspace_id) {
    throw new Error("[worker/light/createRendition] workspace_id is required");
  }
  if (!input.asset_id || !input.kind || !input.uri) {
    throw new Error("[worker/light/createRendition] asset_id, kind, uri are all required");
  }
  return getApi().postRendition({
    workspace_id: input.workspace_id,
    asset_id: input.asset_id,
    kind: input.kind,
    uri: input.uri,
    params_json: input.params_json ?? {},
  });
}
