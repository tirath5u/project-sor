import { Link } from "@tanstack/react-router";
import { NAV_GROUPS } from "./nav";
import { DEPLOYMENT_MARKER, POLICY_SNAPSHOT_DATE } from "@/lib/sor.version";

/**
 * Footer doubles as the human-readable sitemap, which is the cheapest possible
 * findability win for the routes that used to have no inbound link at all.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card/40">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-sm font-semibold">
              myproduct<span className="text-primary">.life</span>
            </p>
            <p className="mt-2 max-w-xs text-xs leading-6 text-muted-foreground">
              Product management in higher-education technology. Built in public and source-backed:
              open Schedule of Reductions calculators, a public API, and agent integrations for
              federal student aid.
            </p>
            <Link
              to="/work"
              className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              See the product work
            </Link>
          </div>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <ul className="mt-2 space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="text-sm text-foreground/80 transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-2 border-t border-border pt-6 text-xs leading-6 text-muted-foreground">
          <p>
            Estimates only. Not an award, approval, or guarantee. Authority is 34 CFR 685.203 and
            current Federal Student Aid guidance; a school must verify every figure.
          </p>
          <p>
            Release {DEPLOYMENT_MARKER} · sources reviewed {POLICY_SNAPSHOT_DATE} · built by{" "}
            <a
              href="https://www.linkedin.com/in/tirath-c-7228b814/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Tirath Chhatriwala
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
