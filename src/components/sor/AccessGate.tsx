import * as React from "react";
import { Bird, Calculator, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "sor-access-v1";
const ACCESS_PASSWORD = "sor2026";
const LINKEDIN_URL = "https://www.linkedin.com/in/tirath-c-7228b814/";

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = React.useState<boolean | null>(null);
  const [pw, setPw] = React.useState("");
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setUnlocked(window.sessionStorage.getItem(STORAGE_KEY) === "1" ||
      window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  // SSR / pre-hydration: render children so SEO and first paint aren't blocked
  if (unlocked === null || unlocked === true) {
    return <>{children}</>;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.trim().toLowerCase() === ACCESS_PASSWORD) {
      window.localStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--gradient-subtle)" }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-lg">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight text-foreground">
              SOR Calculator
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Schedule of Reductions · OBBBA 2026–27
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="access-pw" className="text-xs font-medium text-foreground">
              Access password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="access-pw"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  if (error) setError(false);
                }}
                className="pl-9"
                placeholder="Enter password"
              />
            </div>
            {error ? (
              <p className="text-[11px] text-destructive">Incorrect password.</p>
            ) : null}
          </div>
          <Button type="submit" className="w-full">
            Unlock
          </Button>
        </form>
        <div className="mt-6 border-t border-border/60 pt-4 text-center">
          <p className="text-[11px] text-muted-foreground">
            built by{" "}
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-credit-maroon underline-offset-2 hover:underline"
            >
              <Bird className="h-3 w-3" aria-hidden="true" />
              tirath chhatriwala
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}