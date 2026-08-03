import { Link } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

const AUDIENCES = [
  { to: "/student", label: "Student", exact: true },
  { to: "/student/advanced", label: "Advanced estimate", exact: true },
  { to: "/", label: "Financial aid staff", exact: true },
  { to: "/api-docs", label: "Developers", exact: true },
] as const;

/**
 * Shared student-experience header: brand mark plus a segmented pill switcher
 * across all four audiences. The active pill uses the brand maroon so the tab
 * state reads as part of the brand instead of a neutral black chip.
 */
export function StudentHeader({ active }: { active: "/student" | "/student/advanced" }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Link to="/student" className="flex items-center gap-2 font-display text-base font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Calculator className="h-4 w-4" />
          </span>
          Project SOR
        </Link>
        <nav aria-label="Choose your audience" className="-mx-1 overflow-x-auto">
          <ul className="flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1">
            {AUDIENCES.map((item) => {
              const isActive = item.to === active;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "block whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}