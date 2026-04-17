import { cn } from "@/lib/utils";
import type { TermResult } from "@/lib/sor";

const STYLES: Record<TermResult["status"], string> = {
  eligible: "bg-success/15 text-success border-success/30",
  below_half_time: "bg-warning/20 text-warning-foreground border-warning/40",
  off: "bg-muted text-muted-foreground border-border",
};
const LABELS: Record<TermResult["status"], string> = {
  eligible: "Eligible",
  below_half_time: "Below half-time",
  off: "Off",
};

export function StatusChip({ status, className }: { status: TermResult["status"]; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
