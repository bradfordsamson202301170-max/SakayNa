"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type RealtimeConnectionStatus =
  | "connecting"
  | "subscribed"
  | "error"
  | "closed";

export interface RealtimeTableBinding {
  table: "rides" | "ride_locations" | "ride_status_history" | "notifications";
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  onChange: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) => void;
}

/**
 * Secure, lifecycle-safe Supabase Realtime subscription hook:
 * - Relies on authenticated Supabase SSR cookies + PostgreSQL RLS.
 * - Cleans up channels strictly on unmount (`supabase.removeChannel`).
 * - Reconciles state via `onReconnect` when the browser tab regains focus.
 */
export function useRealtimeSubscription(
  channelName: string,
  bindings: RealtimeTableBinding[],
  onReconnect?: () => void
): RealtimeConnectionStatus {
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");
  const bindingsRef = useRef(bindings);
  const reconnectRef = useRef(onReconnect);

  bindingsRef.current = bindings;
  reconnectRef.current = onReconnect;

  const bindingKey = bindings
    .map((b) => `${b.table}:${b.event ?? "*"}:${b.filter ?? "all"}`)
    .join("|");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel = supabase.channel(channelName);

    for (const binding of bindingsRef.current) {
      channel = channel.on(
        "postgres_changes",
        {
          event: binding.event ?? "*",
          schema: "public",
          table: binding.table,
          ...(binding.filter ? { filter: binding.filter } : {}),
        },
        (payload) => {
          binding.onChange(payload);
        }
      );
    }

    channel.subscribe((subStatus) => {
      if (subStatus === "SUBSCRIBED") {
        setStatus("subscribed");
      } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
        setStatus("error");
      } else if (subStatus === "CLOSED") {
        setStatus("closed");
      }
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && reconnectRef.current) {
        reconnectRef.current();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
      setStatus("closed");
    };
  }, [channelName, bindingKey]);

  return status;
}
