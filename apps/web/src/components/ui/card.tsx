import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-lg font-semibold tracking-tight">{children}</h3>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-600 dark:text-neutral-400">{children}</p>;
}
