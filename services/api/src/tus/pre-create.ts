/**
 * services/api/src/tus/pre-create — tusd `pre-create` hook (T-030).
 *
 * Called by tusd BEFORE it accepts a new upload. tusd POSTs the
 * `HookRequest` envelope; we decide:
 *
 *   - Reject (HTTP 400+) → tusd refuses the upload (returns 403 to
 *     the client). Use this to enforce per-workspace access control
 *     and metadata sanity.
 *   - Accept (HTTP 200) with an empty body → tusd uses its defaults
 *     for the object key.
 *   - Accept with `ChangeFileInfo` → we can rewrite the storage Key
 *     so the chunk lands at a predictable path. We deliberately do
 *     NOT use this; tusd's default `<random-id>` key is fine and the
 *     `finalizeUpload` activity will copy the bytes into the
 *     content-addressed `media-raw/{ws}/{asset_id}/source.{ext}` slot
 *     anyway. Doing the rename at finalize-time keeps the hook fast
 *     and avoids prematurely committing a workspace key for a chunk
 *     that may never finish.
 *
 * What we DO enforce here:
 *   1. The Upload-Metadata must carry `workspaceId`, `authToken`
 *      (Keycloak JWT), `filename`, `filetype`.
 *   2. The JWT must verify against our standard `app.authVerifier`.
 *   3. The caller (resolved by email) must be a member of the
 *      claimed workspace via `listMembershipsForUser`.
 *   4. The mime type must be one we know how to ingest (audio/video).
 *
 * The validated identity (`workspaceId`, `userId`, `original_filename`,
 * `mime`) is echoed back into tusd's MetaData so the `post-finish`
 * hook sees the same values without re-validating.
 *
 * Architecture refs:
 *   - §3.1, §3.10 — tus is the only upload protocol; gateway is
 *     responsible for authorising.
 *   - §11 — never accept workspace_id without proof of membership.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { upsertUserByEmail } from "../db/client.js";
import { listMembershipsForUser } from "../db/repo.js";

/**
 * tusd HTTP-hook payload (only the fields we read are typed). See
 * https://tus.github.io/tusd/advanced-topics/hooks/#http-hooks
 */
interface TusdHookRequest {
  Type?: string;
  Event?: {
    Upload?: {
      ID?: string;
      Size?: number;
      MetaData?: Record<string, string>;
      Storage?: Record<string, string>;
    };
    HTTPRequest?: {
      Method?: string;
      URI?: string;
      RemoteAddr?: string;
    };
  };
}

/** Mimes we know how to probe/transcode. */
const INGESTABLE_MIMES = new Set<string>([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/ogg",
  "audio/webm",
]);

const WORKSPACE_ID_RE = /^[A-Za-z0-9_\-.]+$/;

function rejectProblem(
  reply: FastifyReply,
  req: FastifyRequest,
  status: number,
  title: string,
  detail: string,
): FastifyReply {
  return reply.code(status).type("application/problem+json").send({
    type: "about:blank",
    title,
    status,
    detail,
    instance: req.url,
  });
}

export function registerTusPreCreate(app: FastifyInstance): void {
  app.post("/internal/tus/pre-create", async (req, reply) => {
    const body = (req.body ?? {}) as TusdHookRequest;
    const meta = body.Event?.Upload?.MetaData ?? {};

    const workspaceId = meta["workspaceId"];
    const authToken = meta["authToken"];
    const filename = meta["filename"];
    const filetype = meta["filetype"] ?? meta["mime"];

    if (!workspaceId || !WORKSPACE_ID_RE.test(workspaceId)) {
      return rejectProblem(
        reply,
        req,
        400,
        "Bad Request",
        "Upload-Metadata.workspaceId missing or malformed",
      );
    }
    if (!authToken || typeof authToken !== "string") {
      return rejectProblem(reply, req, 401, "Unauthorized", "Upload-Metadata.authToken missing");
    }
    if (!filename || typeof filename !== "string") {
      return rejectProblem(reply, req, 400, "Bad Request", "Upload-Metadata.filename missing");
    }
    if (!filetype || typeof filetype !== "string" || !INGESTABLE_MIMES.has(filetype)) {
      return rejectProblem(
        reply,
        req,
        415,
        "Unsupported Media Type",
        `mime ${JSON.stringify(filetype ?? "(missing)")} is not ingestable`,
      );
    }

    // Verify the user's JWT — reuse the same verifier the public
    // Bearer auth uses. tusd hooks happen far from the user's
    // Keycloak session, so the *client* attaches its access token as
    // tus metadata. We then validate it here.
    let email: string;
    let displayName: string | null;
    try {
      const { payload } = await app.authVerifier(authToken);
      email = typeof payload["email"] === "string" ? (payload["email"] as string).trim() : "";
      displayName = typeof payload["name"] === "string" ? (payload["name"] as string) : null;
    } catch (err) {
      req.log.warn(
        { err: { message: (err as Error).message } },
        "tus pre-create: token verification failed",
      );
      return rejectProblem(reply, req, 401, "Unauthorized", "authToken verification failed");
    }
    if (!email) {
      return rejectProblem(reply, req, 401, "Unauthorized", "authToken missing email claim");
    }

    // Resolve to our internal user_id (idempotent via
    // upsert_user_by_email SECURITY DEFINER).
    let userId: string;
    try {
      userId = await upsertUserByEmail(email, displayName);
    } catch (err) {
      req.log.error({ err, email }, "tus pre-create: upsertUserByEmail failed");
      return rejectProblem(reply, req, 500, "Internal Server Error", "could not resolve caller");
    }

    // Membership check — never trust the workspaceId metadata alone.
    let memberships: Array<{ workspaceId: string }>;
    try {
      memberships = await listMembershipsForUser(userId);
    } catch (err) {
      req.log.error({ err }, "tus pre-create: listMembershipsForUser failed");
      return rejectProblem(reply, req, 500, "Internal Server Error", "membership lookup failed");
    }
    const member = memberships.some((m) => m.workspaceId === workspaceId);
    if (!member) {
      return rejectProblem(reply, req, 403, "Forbidden", "caller is not a member of workspace");
    }

    // Authorised. Echo a SAFE subset of the metadata back to tusd so
    // post-finish doesn't have to repeat the work. Drop the JWT — we
    // never want it persisted on the upload object.
    return reply.code(200).send({
      HTTPResponse: { StatusCode: 200 },
      ChangeFileInfo: {
        MetaData: {
          workspaceId,
          userId,
          original_filename: filename,
          mime: filetype,
        },
      },
    });
  });
}
