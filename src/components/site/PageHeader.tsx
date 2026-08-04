import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { LinkProps } from "@tanstack/react-router";

export type Crumb = { label: string; to?: LinkProps["to"] };

/**
 * Shared page opener so every route starts with the same eyebrow / title /
 * summary rhythm, which is what makes a multi-audience site feel like one product.
 */
export function PageHeader({
  eyebrow,
  title,
  summary,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  summary?: string;
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border bg-card/40">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {crumbs.map((crumb, index) => (
                <li key={crumb.label} className="flex items-center gap-1">
                  {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                  {crumb.to ? (
                    <Link to={crumb.to} className="transition-colors hover:text-primary">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {summary ? (
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{summary}</p>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </div>
  );
}