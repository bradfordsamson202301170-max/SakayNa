import React from "react";

export type BadgeTone =
  | "orange"
  | "navy"
  | "emerald"
  | "amber"
  | "red"
  | "slate"
  | "blue";

const TONE_CLASSES: Record<BadgeTone, string> = {
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  navy: "bg-[#181A20]/10 text-[#181A20] ring-[#181A20]/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
};

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
}

export function StatusBadge({
  label,
  tone = "slate",
  dot = false,
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}
