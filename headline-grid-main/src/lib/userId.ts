import type { User } from "@supabase/supabase-js";

const STORAGE_KEY = "news_user_id";

export function getEffectiveUserId(user: User | null): string {
  if (user?.id) return user.id;

  if (typeof window === "undefined") {
    return "anonymous";
  }

  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    const fallback = `anon-${Math.random().toString(36).slice(2)}`;
    id = typeof window.crypto !== "undefined" && "randomUUID" in window.crypto
      ? window.crypto.randomUUID()
      : fallback;
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  return id;
}

