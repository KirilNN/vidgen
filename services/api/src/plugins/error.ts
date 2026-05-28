/**
 * services/api — RFC 9457 Problem Details error handler (T-015).
 *
 * Architecture references:
 *   - arch §3.10 — Fastify with structured error responses.
 *   - OpenAPI §components.schemas.ProblemDetails — the wire contract this
 *     plugin produces.
 *
 * Behaviour:
 *   - Validation errors (Fastify schema, AJV) → 400 with detail listing
 *     the failed paths.
 *   - 401/403/404 thrown via @fastify/sensible's `httpErrors` → mapped
 *     to ProblemDetails preserving the status and message.
 *   - Anything else → 500, message is generic ("internal_error") in
 *     production but echoes `err.message` in dev for fast iteration.
 *   - Always sets `Content-Type: application/problem+json` per RFC 9457.
 *   - Always logs at error level (Fastify's default would log at info
 *     for 4xx; we want a single normalised emit instead).
 */
import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: unknown;
};

const TYPE_URI = "about:blank";

function statusToTitle(status: number): string {
  switch (status) {
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 409:
      return "Conflict";
    case 422:
      return "Unprocessable Entity";
    case 429:
      return "Too Many Requests";
    case 500:
      return "Internal Server Error";
    default:
      return "Error";
  }
}

async function errorPlugin(app: FastifyInstance): Promise<void> {
  // Fastify only invokes setNotFoundHandler when no route matched. We send
  // the same Problem Details envelope so clients can rely on one shape.
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const body: ProblemDetails = {
      type: TYPE_URI,
      title: statusToTitle(404),
      status: 404,
      detail: `route ${request.method} ${request.url} not found`,
      instance: request.url,
    };
    reply.code(404).type("application/problem+json").send(body);
  });

  app.setErrorHandler((err: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const isDev = (process.env["NODE_ENV"] ?? "development") === "development";
    // `statusCode` is populated by @fastify/sensible's httpErrors and by
    // Fastify's own validation pipeline. Default to 500.
    const status =
      err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;

    const body: ProblemDetails = {
      type: TYPE_URI,
      title: statusToTitle(status),
      status,
      instance: request.url,
    };

    if (err.validation && err.validation.length > 0) {
      body.detail = "request failed schema validation";
      body.errors = err.validation;
    } else if (status >= 500) {
      body.detail = isDev ? err.message : "internal_error";
    } else {
      body.detail = err.message;
    }

    // Always log server errors at error; client errors at warn — both via
    // Fastify's request logger so trace IDs propagate.
    if (status >= 500) {
      request.log.error({ err, status }, "request failed");
    } else {
      request.log.warn(
        { err: { message: err.message, code: err.code }, status },
        "request rejected",
      );
    }

    reply.code(status).type("application/problem+json").send(body);
  });
}

export default fp(errorPlugin, { name: "vidgen-error" });
