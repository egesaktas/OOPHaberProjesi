import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/news/CategoryBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { encodeUrlToBase64Url, fetchLiveNews, type LiveNewsSummary } from '@/lib/liveNewsApi';

const Bundle = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LiveNewsSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchLiveNews();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    setError(null);
    setLoading(true);
    fetchLiveNews(ac.signal)
      .then(setItems)
      .catch((e) => {
        if (e?.name !== 'AbortError') setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const sources = useMemo(() => {
    const bySource = new Map<string, LiveNewsSummary[]>();
    for (const it of items) {
      const key = it.kaynak || 'Source';
      const arr = bySource.get(key) || [];
      arr.push(it);
      bySource.set(key, arr);
    }
    return Array.from(bySource.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <h1 className="headline-lg">Bundle Mode</h1>
            <p className="text-muted-foreground">
              Compare news from multiple sources side-by-side
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        </div>
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {/* Bundle Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(loading ? Array.from({ length: 4 }).map((_, i) => [`Source ${i + 1}`, []] as const) : sources).map(
            ([sourceName, articles]) => (
            <div
              key={sourceName}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              {/* Source Header */}
              <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold">{sourceName}</h2>
                <ExternalLink className="h-4 w-4 opacity-70" />
              </div>

              {/* Articles List */}
              <div className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="p-4 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))
                ) : (
                  articles.slice(0, 10).map((article) => (
                    <Link
                      key={article.link}
                      to={`/news/${encodeUrlToBase64Url(article.link)}`}
                      className="block p-4 hover:bg-accent/50 transition-colors group"
                    >
                      <CategoryBadge category={article.kategori} className="mb-2" />
                      <h3 className="font-serif font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {article.baslik}
                      </h3>
                      <p className="meta-text mt-2">{article.zaman || 'Live'}</p>
                    </Link>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-secondary/50 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  {loading ? 'Loading…' : `${articles.length} items`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-muted rounded-lg p-6 text-center">
          <h3 className="font-serif font-semibold text-lg mb-2">
            Multi-Source News Aggregation
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Bundle Mode allows you to compare news coverage from multiple sources simultaneously. 
            This feature helps identify different perspectives and stay comprehensively informed 
            on breaking stories.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Bundle;
