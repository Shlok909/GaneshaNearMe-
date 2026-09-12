"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// No duplicate user/session state. Server guards remain authoritative.
export function SessionRefresh() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/auth");
      if (event === "USER_UPDATED") router.refresh();
    });
    function refresh() {
      router.refresh();
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);
  return null;
}
