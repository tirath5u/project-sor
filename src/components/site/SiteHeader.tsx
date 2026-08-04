import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav";
import { ENGINE_VERSION, POLICY_YEAR } from "@/lib/sor.version";

/**
 * Persistent site chrome. Every route is reachable from here, so no page is an
 * orphan URL any more. Colors come from theme tokens only, so the header
 * inherits the maroon student theme or the default palette automatically.
 */
export function SiteHeader() {
  const [open, setOpen] = React.useState<string | null>(null);
  const [mobile, setMobile] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link to="/" className="font-display text-sm font-semibold tracking-tight sm:text-base">
          myproduct<span className="text-primary">.life</span>
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV_GROUPS.map((group) => (
            <div
              key={group.label}
              className="relative"
              onMouseEnter={() => setOpen(group.label)}
              onMouseLeave={() => setOpen(null)}
            >
              <button
                type="button"
                aria-expanded={open === group.label}
                onClick={() => setOpen(open === group.label ? null : group.label)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  open === group.label
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {group.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {open === group.label ? (
                <div className="absolute left-0 top-full w-80 pt-1">
                  <ul className="rounded-xl border border-border bg-popover p-2 shadow-lg">
                    {group.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          to={item.to}
                          onClick={() => setOpen(null)}
                          className="block rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                          activeProps={{ className: "bg-muted" }}
                        >
                          <span className="block text-sm font-medium text-foreground">{item.label}</span>
                          <span className="block text-xs leading-5 text-muted-foreground">{item.blurb}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/releases"
            className="hidden rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary sm:inline-flex"
          >
            Engine v{ENGINE_VERSION} · {POLICY_YEAR}
          </Link>
          <a
            href="https://github.com/tirathc/project-sor/issues/new?template=scenario-challenge.yml"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted lg:inline-flex"
          >
            Report a scenario
          </a>
          <button
            type="button"
            aria-label={mobile ? "Close menu" : "Open menu"}
            aria-expanded={mobile}
            onClick={() => setMobile((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border md:hidden"
          >
            {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobile ? (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.to}
                        onClick={() => setMobile(false)}
                        className="block rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                        activeProps={{ className: "bg-muted" }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}