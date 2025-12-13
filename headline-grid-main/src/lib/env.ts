export const env = {
  newsApiBaseUrl: (import.meta.env.VITE_NEWS_API_BASE_URL as string | undefined) ?? "http://localhost:5284",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabasePublishableKey);
