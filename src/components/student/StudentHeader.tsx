import { Link } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "student" | "advanced" | "staff";

const tabs: { id: Tab; label: string; to: string }[] = [
  { id: "student", label: "Student estimate", to: "/student" },
  { id: "advanced", label: "Advanced estimate", to: "/student/advanced" },
  { id: "staff", label: "Staff & developers", to: "/" },
];

export function StudentHeader({ active }: { active: Tab }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/student" className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground">
            <Calculator className="h-4 w-4" />
          </span>
          <span className="truncate font-display text-sm font-semibold tracking-tight">
            Project SOR
          </span>
        </Link>
        <nav
          aria-label="Choose a calculator"
          className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 p-1"
        >
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.to}
              className={cn(
                "rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3.5 sm:text-sm",
                tab.id === active
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}