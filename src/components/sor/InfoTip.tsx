import * as React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTipProps {
  /** Body content shown inside the tooltip. Keep to ~2 short sentences. */
  children: React.ReactNode;
  /** Accessible label for the trigger button. */
  label?: string;
  /** Optional className override on the trigger. */
  className?: string;
  /** Tooltip placement. */
  side?: "top" | "right" | "bottom" | "left";
  /** Visual size - defaults to xs (12px icon). */
  size?: "xs" | "sm";
}

/**
 * Small info-icon button that reveals a short explanation on hover/focus/tap.
 * Built on Radix Tooltip via the existing UI primitive. Keyboard-focusable
 * and screen-reader friendly.
 */
export function InfoTip({
  children,
  label = "More info",
  className,
  side = "top",
  size = "xs",
}: InfoTipProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.preventDefault()}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4",
            className,
          )}
        >
          <Info className={size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} role="tooltip" className="max-w-[260px] text-[11px] leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * A label + InfoTip pair for inline use inside form rows, table headers, and
 * matrix row labels.
 */
export function LabelWithTip({
  children,
  tip,
  className,
}: {
  children: React.ReactNode;
  tip: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>{children}</span>
      <InfoTip>{tip}</InfoTip>
    </span>
  );
}
