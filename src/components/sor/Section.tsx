import * as React from "react";
import { cn } from "@/lib/utils";
import { InfoTip } from "./InfoTip";

interface SectionProps {
  letter: string;
  title: string;
  description?: string;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Section({ letter, title, description, tooltip, children, className }: SectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <header className="mb-4 flex items-start gap-3 border-b border-border/60 pb-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary"
          aria-hidden
        >
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold leading-tight text-foreground sm:text-lg">
              {title}
            </h2>
            {tooltip ? <InfoTip size="sm">{tooltip}</InfoTip> : null}
          </div>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>
          ) : null}
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}
