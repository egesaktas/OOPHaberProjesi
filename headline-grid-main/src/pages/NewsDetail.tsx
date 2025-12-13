import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Clock, User, ExternalLink } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/news/CategoryBadge';
import { NewsCard } from '@/components/news/NewsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { env, isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/integrations/supabase/client';
import type { NewsArticle } from '@/types';
import {
  decodeBase64UrlToUrl,
  encodeUrlToBase64Url,
  fetchLiveNews,
  fetchLiveNewsDetail,
  isUuid,
  type LiveNewsDetail,
  type LiveNewsSummary,
  liveSummaryToArticle,
} from '@/lib/liveNewsApi';

const NewsDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [liveSummary, setLiveSummary] = useState<LiveNewsSummary | null>(null);
  const [liveDetail, setLiveDetail] = useState<LiveNewsDetail | null>(null);
  const [relatedLive, setRelatedLive] = useState<NewsArticle[]>([]);

  const [supabaseArticle, setSupabaseArticle] = useState<NewsArticle | null>(null);

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setLiveSummary(null);
    setLiveDetail(null);
    setRelatedLive([]);
    setSupabaseArticle(null);

    const run = async () => {
      try {
        if (isUuid(id)) {
          if (!isSupabaseConfigured) {
            setError(
              "This article looks like a Supabase item, but Supabase isn't configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
            );
            return;
          }
          const { data, error: supaError } = await supabase
            .from('news')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (supaError) throw supaError;
          if (!data) {
            setError('Article not found.');
            return;
          }
          setSupabaseArticle(data as NewsArticle);
          return;
        }

        const decodedUrl = decodeBase64UrlToUrl(id);
        const summaryFallback: LiveNewsSummary = {
          baslik: 'Loading…',
          link: decodedUrl,
          resimUrl: '',
          kaynak: 'Live',
          kategori: 'Gündem',
          zaman: '',
        };
        setLiveSummary(summaryFallback);

        const [list, detail] = await Promise.all([
          fetchLiveNews(ac.signal),
          fetchLiveNewsDetail(id, ac.signal),
        ]);

        const summary = list.find((x) => encodeUrlToBase64Url(x.link) === id) || summaryFallback;
        setLiveSummary(summary);
        setLiveDetail(detail);

        if (summary.kategori) {
          const related = list
            .filter((x) => x.kategori === summary.kategori && encodeUrlToBase64Url(x.link) !== id)
            .slice(0, 3)
            .map(liveSummaryToArticle);
          setRelatedLive(related);
        }
      } catch (e) {
        if (e?.name !== 'AbortError') {
          setError(e instanceof Error ? e.message : 'Failed to load article');
        }
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => ac.abort();
  }, [id]);

  const unified = useMemo(() => {
    if (supabaseArticle) return { kind: 'supabase' as const, article: supabaseArticle };
    const merged = {
      ...(liveSummary || {}),
      ...(liveDetail || {}),
    } as LiveNewsDetail;
    return { kind: 'live' as const, article: merged };
  }, [liveDetail, liveSummary, supabaseArticle]);

  const publishDate = useMemo(() => {
    if (unified.kind === 'supabase') {
      return format(new Date(unified.article.created_at), 'MMMM d, yyyy');
    }
    if (unified.article?.yayinTarihi) {
      return format(new Date(unified.article.yayinTarihi), 'MMMM d, yyyy');
    }
    return '';
  }, [unified]);

  const timeAgo = useMemo(() => {
    if (unified.kind === 'supabase') {
      return formatDistanceToNow(new Date(unified.article.created_at), { addSuffix: true });
    }
    if (unified.article?.yayinTarihi) {
      return formatDistanceToNow(new Date(unified.article.yayinTarihi), { addSuffix: true });
    }
    return '';
  }, [unified]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to News
        </Link>

        <article className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
              <p className="font-medium">Couldn’t load the article.</p>
              <p className="text-sm opacity-90">{error}</p>
              <div className="mt-3">
                <Button asChild variant="outline">
                  <Link to="/">Back to Home</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Header */}
          <header className="mb-8">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-6 w-4/5" />
              </div>
            ) : (
              <>
                <CategoryBadge
                  category={unified.kind === 'supabase' ? unified.article.category : (unified.article.kategori || '')}
                  className="mb-4"
                />
                <h1 className="headline-xl mb-4">
                  {unified.kind === 'supabase' ? unified.article.title : unified.article.baslik}
                </h1>
                {unified.kind === 'supabase' && unified.article.summary && (
                  <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                    {unified.article.summary}
                  </p>
                )}
              </>
            )}
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-y border-border py-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>
                  By{" "}
                  <strong className="text-foreground">
                    {unified.kind === 'supabase'
                      ? unified.article.author_name || 'Staff Writer'
                      : unified.article.kaynak || 'Live'}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {publishDate ? `${publishDate}${timeAgo ? ` (${timeAgo})` : ''}` : (unified.kind === 'live' ? unified.article.zaman : '')}
                </span>
              </div>
              <div className="flex-1" />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    try {
                      const toCopy =
                        unified.kind === 'live'
                          ? unified.article.link
                          : `${window.location.origin}/news/${unified.article.id}`;
                      await navigator.clipboard.writeText(toCopy);
                      toast.success('Link copied');
                    } catch {
                      toast.error('Could not copy link');
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                {unified.kind === 'live' && unified.article.link && (
                  <Button asChild variant="ghost" size="icon">
                    <a href={unified.article.link} target="_blank" rel="noreferrer" aria-label="Open original source">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Featured Image */}
          {!loading && (unified.kind === 'supabase' ? unified.article.image_url : unified.article.resimUrl) && (
            <figure className="mb-8">
              <img
                src={unified.kind === 'supabase' ? (unified.article.image_url as string) : unified.article.resimUrl}
                alt=""
                className="w-full aspect-video object-cover rounded-lg"
              />
              {unified.kind === 'live' && (
                <figcaption className="mt-2 text-sm text-muted-foreground text-center">
                  Source: {unified.article.kaynak}
                </figcaption>
              )}
            </figure>
          )}

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-11/12" />
                <Skeleton className="h-5 w-10/12" />
                <Skeleton className="h-5 w-9/12" />
              </div>
            ) : (
              <div className="body-text space-y-6 whitespace-pre-line">
                {unified.kind === 'supabase' ? unified.article.content : (unified.article.icerik || '')}
              </div>
            )}
          </div>

          {unified.kind === 'live' && (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground mr-2">API:</span>
                <code className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">
                  {env.newsApiBaseUrl}
                </code>
              </div>
            </div>
          )}
        </article>

        {/* Related Articles */}
        {unified.kind === 'live' && relatedLive.length > 0 && (
          <section className="max-w-4xl mx-auto mt-12 pt-12 border-t border-border">
            <h2 className="headline-md mb-6">Related Stories</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedLive.map((related) => (
                <NewsCard key={related.id} article={related} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default NewsDetail;
