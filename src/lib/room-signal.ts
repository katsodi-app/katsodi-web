"use client";
import { useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client used ONLY for Realtime room signals. It holds
 * no session (the auth cookie stays HttpOnly): room signals are content-free
 * public broadcasts, and the data itself is always re-read through the
 * authorized room API.
 */
let client: SupabaseClient | null | undefined;
function signalClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  client = null;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key && new URL(url).protocol === "https:")
      client = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
  } catch {
    // No public config in this bundle (tests, unconfigured): polling only.
    client = null;
  }
  return client;
}

/**
 * Calls `onChange` shortly after the database signals that a room changed.
 * Returns whether the Realtime subscription is live, so callers can poll less
 * often while it is.
 */
export function useRoomSignal(roomId: string, onChange: () => void) {
  const [live, setLive] = useState(false);
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });
  useEffect(() => {
    const realtime = signalClient();
    if (!realtime) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = realtime
      .channel(`room:${roomId}`)
      .on("broadcast", { event: "changed" }, () => {
        // Several rows often change in one action; refresh once.
        clearTimeout(timer);
        timer = setTimeout(() => callback.current(), 120);
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      clearTimeout(timer);
      setLive(false);
      void realtime.removeChannel(channel);
    };
  }, [roomId]);
  return live;
}
