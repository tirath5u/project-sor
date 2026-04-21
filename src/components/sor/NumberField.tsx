import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { InfoTip } from "./InfoTip";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  step?: number;
  hint?: string;
  tooltip?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  id?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  step,
  hint,
  tooltip,
  className,
  inputClassName,
  id: idProp,
}: NumberFieldProps) {
  const reactId = React.useId();
  const id = idProp ?? reactId;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-xs font-medium text-foreground">
          {label}
        </Label>
        {tooltip ? <InfoTip>{tooltip}</InfoTip> : null}
      </div>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const v = e.target.value === "" ? 0 : Number(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-10 rounded-lg bg-background",
            prefix && "pl-7",
            suffix && "pr-10",
            inputClassName,
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
