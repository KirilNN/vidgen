import { Button } from "./ui/button";

export function SignInButton() {
  return (
    <form action="/api/auth/login" method="GET">
      <Button type="submit">Sign in with Keycloak</Button>
    </form>
  );
}
