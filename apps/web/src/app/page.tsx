import { redirect } from "next/navigation";
import { getSession, isSessionValid } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (isSessionValid(session)) {
    redirect("/dashboard");
  }
  redirect("/login");
}
