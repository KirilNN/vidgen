"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Workspace {
  workspaceId: string;
  name: string;
  region: string;
  tier: string;
  role: "owner" | "editor" | "viewer";
  createdAt: string;
}

interface MeResponse {
  user: { userId: string; email: string; displayName?: string | null };
  workspaces: Workspace[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export function DashboardClient({ initialData }: { initialData: MeResponse }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const meQ = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => fetchJson<MeResponse>("/api/me"),
    initialData,
  });

  const createMu = useMutation<Workspace, Error, { name: string }>({
    mutationFn: (body) =>
      fetchJson<Workspace>("/api/workspaces", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setName("");
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const data = meQ.data ?? initialData;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Signed in as {data.user.email}
          </p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <Button variant="ghost" type="submit">
            Sign out
          </Button>
        </form>
      </header>

      <Card>
        <CardTitle>Create a workspace</CardTitle>
        <CardDescription>You will become its owner.</CardDescription>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createMu.mutate({ name: name.trim() });
          }}
        >
          <Input
            placeholder="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Workspace name"
            required
            minLength={1}
            maxLength={200}
          />
          <Button type="submit" disabled={createMu.isPending}>
            {createMu.isPending ? "Creating…" : "Create"}
          </Button>
        </form>
        {createMu.error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {createMu.error.message}
          </p>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Your workspaces</h2>
        {data.workspaces.length === 0 ? (
          <Card>
            <CardDescription>No workspaces yet. Create one above.</CardDescription>
          </Card>
        ) : (
          <ul className="space-y-3">
            {data.workspaces.map((w) => (
              <li key={w.workspaceId}>
                <Card>
                  <CardTitle>{w.name}</CardTitle>
                  <CardDescription>
                    Region: {w.region} · Tier: {w.tier} · Role: {w.role}
                  </CardDescription>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
