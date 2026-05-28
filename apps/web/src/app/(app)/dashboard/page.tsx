import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/api";
import { getSession, isSessionValid } from "@/lib/session";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    redirect("/login");
  }

  const client = createServerClient(session.accessToken);
  const { data, error } = await client.GET("/me");
  if (error || !data) {
    // Token may have been revoked server-side. Clear cookie + bounce to login.
    await session.destroy();
    redirect("/login");
  }
  return <DashboardClient initialData={data} />;
}
