import React from "react";

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-9 w-9" : "h-6 w-6";
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-slate-200 border-t-orange-500 ${dims}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-7 w-32 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-40 rounded bg-slate-100" />
    </div>
  );
}

export function PageLoader({ label = "Loading SakayNa..." }: { label?: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
      <Spinner size="lg" />
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}
