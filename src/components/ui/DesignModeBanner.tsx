import React from "react";
import { Info } from "lucide-react";

interface DesignModeBannerProps {
  scope?: string;
}

export function DesignModeBanner({
  scope = "This screen displays design-only placeholder data. Live Supabase authentication, database queries, and realtime updates will be connected in Batch 4+.",
}: DesignModeBannerProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-3 text-xs text-slate-800"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
      <p className="leading-relaxed">
        <span className="font-semibold text-[#181A20]">
          UI Foundation Preview (Design-Only):
        </span>{" "}
        {scope}
      </p>
    </div>
  );
}
