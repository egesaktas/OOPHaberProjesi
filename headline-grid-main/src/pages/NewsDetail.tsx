import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Clock, User, ExternalLink, ThumbsDown, ThumbsUp } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/news/CategoryBadge';
import { NewsCard } from '@/components/news/NewsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { env, isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getEffectiveUserId } from '@/lib/userId';
import { sendFeedback } from '@/lib/userPreferencesApi';
import type { NewsArticle } from '@/types';
import {
  decodeBase64UrlToUrl,
  encodeUrlToBase64Url,
  fetchLiveNewsPage,
  fetchLiveNewsDetail,
  isUuid,
  type LiveNewsDetail,
  type LiveNewsSummary,
  liveSummaryToArticle,
} from '@/lib/liveNewsApi';

const NewsDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [liveSummary, setLiveSummary] = useState<LiveNewsSummary | null>(null);
  const [liveDetail, setLiveDetail] = useState<LiveNewsDetail | null>(null);
  const [relatedLive, setRelatedLive] = useState<NewsArticle[]>([]);

  const [supabaseArticle, setSupabaseArticle] = useState<NewsArticle | null>(null);
  const [feedbackValue, setFeedbackValue] = useState<1 | -1 | 0>(0);

  const scoreSimilar = (a: string, b: string) => {
    const stop = new Set([
      've',
      'ile',
      'ama',
      'fakat',
      'de',
      'da',
      'bir',
      'bu',
      'şu',
      'o',
      'için',
      'mi',
      'mı',
      'mu',
      'mü',
      'ne',
      'nasıl',
      'neden',
      'son',
      'dakika',
    ]);
    const tokens = (s: string) =>
      s
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((t) => t.length >= 3 && !stop.has(t));

    const aT = tokens(a);
    const bT = tokens(b);
    if (aT.length === 0 || bT.length === 0) return 0;

    const aSet = new Set(aT);
    let hit = 0;
    for (const t of bT) if (aSet.has(t)) hit++;
    return hit / Math.sqrt(aT.length * bT.length);
  };

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

        const [page, detail] = await Promise.all([
          fetchLiveNewsPage({ skip: 0, take: 200, signal: ac.signal }),
          fetchLiveNewsDetail(id, ac.signal),
        ]);
        const list = page.items;

        const summary = list.find((x) => encodeUrlToBase64Url(x.link) === id) || summaryFallback;
        setLiveSummary(summary);
        setLiveDetail(detail);

        const targetTitle = summary.baslik || detail.baslik || '';
        const related = list
          .filter((x) => encodeUrlToBase64Url(x.link) !== id)
          .map((x) => {
            let score = scoreSimilar(targetTitle, x.baslik || '');
            if (summary.kategori && x.kategori && x.kategori === summary.kategori) score += 0.25;
            if (summary.kaynak && x.kaynak && x.kaynak === summary.kaynak) score += 0.05;
            return { item: x, score };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((x) => liveSummaryToArticle(x.item));

        setRelatedLive(related);
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

  const handleFeedback = async (value: 1 | -1) => {
    if (unified.kind !== 'live' || !unified.article.link) return;

    const userId = getEffectiveUserId(user);
    setFeedbackValue(value);

    try {
      await sendFeedback({
        userId,
        newsUrl: unified.article.link,
        value,
      });
      toast.success(value === 1 ? 'Beğendin olarak kaydedildi' : 'Beğenmedin olarak kaydedildi');
    } catch (e) {
      console.error(e);
      toast.error('Tercih kaydedilemedi');
    }
  };

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
              <div className="flex items-center gap-2">
                {unified.kind === 'live' && unified.article.link && (
                  <div className="flex gap-1 mr-2" aria-label="Like or dislike this article">
                    <Button
                      variant={feedbackValue === 1 ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => handleFeedback(1)}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={feedbackValue === -1 ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => handleFeedback(-1)}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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

        {unified.kind === 'live' && relatedLive.length > 0 && (
          <section className="max-w-4xl mx-auto mt-10">
            <div className="bg-card border border-border rounded-lg p-5">
              <h2 className="font-serif font-bold text-lg mb-4">Benzer haberler</h2>
              <div className="space-y-0">
                {relatedLive.map((related) => (
                  <NewsCard key={related.id} article={related} variant="compact" />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default NewsDetail;
