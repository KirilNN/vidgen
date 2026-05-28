/**
 * POST /api/auth/logout — clear the session cookie + bounce to /login.
 *
 * GET is supported as a convenience for in-app links.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handler(req: Request) {
  const session = await getSession();
  await session.destroy();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const GET = handler;
export const POST = handler;
