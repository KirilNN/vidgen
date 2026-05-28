import { SignInButton } from "@/components/sign-in-button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardTitle>Welcome to Vidgen</CardTitle>
        <CardDescription>Sign in to access your workspaces.</CardDescription>
        <div className="mt-6">
          <SignInButton />
        </div>
      </Card>
    </main>
  );
}
