import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { FeaturedNews } from '@/components/news/FeaturedNews';
import { NewsCard } from '@/components/news/NewsCard';
import { TrendingSidebar } from '@/components/news/TrendingSidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { NewsArticle } from '@/types';
import { fetchLiveNews, fetchLiveNewsDetail, liveSummaryToArticle } from '@/lib/liveNewsApi';

const LIVE_CATEGORIES = ["Gündem", "Spor", "Ekonomi", "Dünya", "Magazin", "Teknoloji"] as const;

const Index = () => {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const query = searchParams.get('q')?.trim() || '';

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchLiveNews();
      setArticles(data.map(liveSummaryToArticle));
      setLastUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    setError(null);
    setLoading(true);
    fetchLiveNews(ac.signal)
      .then((data) => {
        setArticles(data.map(liveSummaryToArticle));
        setLastUpdatedAt(new Date());
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') {
          setError(e instanceof Error ? e.message : 'Failed to load news');
        }
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  const filteredNews = useMemo(() => {
    let next = articles;
    if (categoryFilter) next = next.filter((a) => a.category === categoryFilter);
    if (query) {
      const q = query.toLowerCase();
      next = next.filter((a) => a.title.toLowerCase().includes(q));
    }
    return next;
  }, [articles, categoryFilter, query]);

  const featuredArticle = filteredNews[0];
  const latestNews = featuredArticle ? filteredNews.slice(1) : [];
  const attemptedHeroImages = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!featuredArticle || loading) return;
    if (featuredArticle.image_url) return;
    if (attemptedHeroImages.current.has(featuredArticle.id)) return;
    attemptedHeroImages.current.add(featuredArticle.id);

    const ac = new AbortController();
    fetchLiveNewsDetail(featuredArticle.id, ac.signal)
      .then((detail) => {
        if (!detail.resimUrl) return;
        setArticles((prev) =>
          prev.map((a) => (a.id === featuredArticle.id ? { ...a, image_url: detail.resimUrl } : a))
        );
      })
      .catch(() => {});

    return () => ac.abort();
  }, [featuredArticle?.id, featuredArticle?.image_url, loading]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="headline-lg">{categoryFilter || 'Latest News'}</h1>
            <p className="text-muted-foreground">
              {query ? `Results for “${query}”` : 'Live headlines from multiple sources'}
              {lastUpdatedAt ? ` • Updated ${lastUpdatedAt.toLocaleTimeString()}` : ''}
            </p>
          </div>
          <Button variant="outline" className="gap-2 w-fit" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
        </div>

        {/* Category pills */}
        <div className="mb-6 overflow-x-auto whitespace-nowrap">
          <div className="inline-flex gap-2">
            <Link
              to={query ? `/?q=${encodeURIComponent(query)}` : '/'}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !categoryFilter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              Tümü
            </Link>
            {LIVE_CATEGORIES.map((cat) => {
              const params = new URLSearchParams();
              params.set('category', cat);
              if (query) params.set('q', query);
              return (
                <Link
                  key={cat}
                  to={`/?${params.toString()}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Featured Section */}
        {!query && !loading && featuredArticle && (
          <section className="mb-8">
            <FeaturedNews article={featuredArticle} />
          </section>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* News Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="headline-md">Latest News</h2>
              {error && <span className="text-sm text-destructive">{error}</span>}
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : latestNews.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {latestNews.map((article, index) => (
                  <div
                    key={article.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <NewsCard article={article} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No articles found.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {!loading && articles.length > 0 && <TrendingSidebar articles={articles} />}
            
            {/* Newsletter Signup */}
            <div className="bg-primary text-primary-foreground rounded-lg p-6">
              <h3 className="font-serif font-bold text-xl mb-2">Stay Informed</h3>
              <p className="text-primary-foreground/80 text-sm mb-4">
                Get the latest news delivered to your inbox.
              </p>
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-4 py-2 rounded-md bg-white/10 border border-white/20 placeholder:text-white/50 text-white mb-3 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button className="w-full py-2 bg-white text-primary font-semibold rounded-md hover:bg-white/90 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="container py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-serif font-bold text-lg mb-4">NewsHub</h4>
              <p className="text-muted-foreground text-sm">
                Your trusted source for breaking news and in-depth analysis.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Categories</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/?category=Gündem" className="hover:text-primary transition-colors">Gündem</Link></li>
                <li><Link to="/?category=Spor" className="hover:text-primary transition-colors">Spor</Link></li>
                <li><Link to="/?category=Ekonomi" className="hover:text-primary transition-colors">Ekonomi</Link></li>
                <li><Link to="/?category=Dünya" className="hover:text-primary transition-colors">Dünya</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">More</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/?category=Magazin" className="hover:text-primary transition-colors">Magazin</Link></li>
                <li><Link to="/?category=Teknoloji" className="hover:text-primary transition-colors">Teknoloji</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} NewsHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
