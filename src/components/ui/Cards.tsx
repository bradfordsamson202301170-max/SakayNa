import React from "react";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  accent?: "orange" | "navy" | "emerald" | "blue";
}

const ACCENT_BG = {
  orange: "bg-orange-50 text-orange-600",
  navy: "bg-[#181A20]/10 text-[#181A20]",
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
};

export function StatCard({
  label,
  value,
  subtext,
  icon,
  accent = "orange",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
            {label}
          </p>
          <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-[#181A20] sm:mt-2 sm:text-2xl">
            {value}
          </p>
          {subtext && (
            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500 sm:text-xs">
              {subtext}
            </p>
          )}
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${ACCENT_BG[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-xs ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#181A20] sm:text-base">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
