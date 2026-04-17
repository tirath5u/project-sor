import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  letter: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ letter, title, description, children, className }: SectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6",
        className,
      )}
    >
      <header className="mb-4 flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
          aria-hidden
        >
          {letter}
        </span>
        <div>
          <h2 className="text-base font-semibold leading-tight text-foreground sm:text-lg">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>
          ) : null}
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}
