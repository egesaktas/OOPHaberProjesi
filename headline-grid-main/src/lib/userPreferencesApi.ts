import { env } from "@/lib/env";

export async function sendFeedback(params: {
  userId: string;
  newsUrl: string;
  value: 1 | -1;
}) {
  await fetch(`${env.newsApiBaseUrl}/api/news/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: params.userId,
      newsUrl: params.newsUrl,
      value: params.value,
    }),
  });
}

