import { useEffect, useRef } from "react";

export function useInfiniteScroll(options: {
  enabled: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!options.enabled) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) options.onLoadMore();
      },
      { rootMargin: options.rootMargin ?? "600px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options.enabled, options.onLoadMore, options.rootMargin]);

  return { sentinelRef };
}

