import { env } from "@/lib/env";
import type { NewsArticle } from "@/types";

export interface LiveNewsSummary {
  baslik: string;
  link: string;
  resimUrl: string;
  kaynak: string;
  kategori: string;
  zaman: string;
  yayinTarihi?: string;
}

export interface LiveNewsDetail extends LiveNewsSummary {
  icerik: string;
}

function bytesToBinary(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return binary;
}

export function encodeUrlToBase64Url(url: string) {
  const bytes = new TextEncoder().encode(url);
  const base64 = btoa(bytesToBinary(bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeBase64UrlToUrl(encoded: string) {
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) base64 = base64.padEnd(base64.length + (4 - pad), "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function fetchLiveNews(signal?: AbortSignal) {
  const res = await fetch(`${env.newsApiBaseUrl}/api/news`, { signal });
  if (!res.ok) throw new Error(`News API error (${res.status})`);
  return (await res.json()) as LiveNewsSummary[];
}

export async function fetchLiveNewsDetail(encodedUrl: string, signal?: AbortSignal) {
  const res = await fetch(`${env.newsApiBaseUrl}/api/news/detail?url=${encodeURIComponent(encodedUrl)}`, { signal });
  if (!res.ok) throw new Error(`News detail API error (${res.status})`);
  return (await res.json()) as LiveNewsDetail;
}

export async function fetchRecommendations(userId: string, signal?: AbortSignal) {
  const res = await fetch(
    `${env.newsApiBaseUrl}/api/news/recommendations?userId=${encodeURIComponent(userId)}`,
    { signal }
  );
  if (!res.ok) throw new Error(`Recommendations API error (${res.status})`);
  return (await res.json()) as LiveNewsSummary[];
}

export function liveSummaryToArticle(item: LiveNewsSummary): NewsArticle {
  const createdAt = item.yayinTarihi || new Date().toISOString();
  return {
    id: encodeUrlToBase64Url(item.link),
    title: item.baslik,
    summary: null,
    content: "",
    image_url: item.resimUrl || null,
    category: item.kategori,
    author_id: "rss",
    status: "published",
    is_featured: false,
    created_at: createdAt,
    updated_at: createdAt,
    author_name: item.kaynak,
  };
}
