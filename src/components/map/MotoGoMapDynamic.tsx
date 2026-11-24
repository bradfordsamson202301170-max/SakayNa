"use client";

import dynamic from "next/dynamic";
import type { MotoGoMapProps } from "./MotoGoMap";

export const MotoGoMapDynamic = dynamic<MotoGoMapProps>(
  () => import("./MotoGoMap").then((mod) => mod.MotoGoMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 w-full animate-pulse items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-medium text-slate-500">
        Loading OpenStreetMap &amp; Leaflet...
      </div>
    ),
  }
);
