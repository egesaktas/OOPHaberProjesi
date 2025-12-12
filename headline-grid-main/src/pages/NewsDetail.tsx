import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Bookmark, Clock, User } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/news/CategoryBadge';
import { NewsCard } from '@/components/news/NewsCard';
import { mockNews } from '@/data/mockNews';

const NewsDetail = () => {
  const { id } = useParams();
  const article = mockNews.find((a) => a.id === id);

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <h1 className="headline-lg mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const relatedArticles = mockNews
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 3);

  const timeAgo = formatDistanceToNow(new Date(article.created_at), { addSuffix: true });
  const publishDate = format(new Date(article.created_at), 'MMMM d, yyyy');

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
          {/* Header */}
          <header className="mb-8">
            <CategoryBadge category={article.category} className="mb-4" />
            <h1 className="headline-xl mb-4">{article.title}</h1>
            {article.summary && (
              <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                {article.summary}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-y border-border py-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>By <strong className="text-foreground">{article.author_name || 'Staff Writer'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{publishDate} ({timeAgo})</span>
              </div>
              <div className="flex-1" />
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Featured Image */}
          {article.image_url && (
            <figure className="mb-8">
              <img
                src={article.image_url}
                alt=""
                className="w-full aspect-video object-cover rounded-lg"
              />
              <figcaption className="mt-2 text-sm text-muted-foreground text-center">
                Photo: Reuters
              </figcaption>
            </figure>
          )}

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <div className="body-text space-y-6">
              <p>{article.content}</p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <blockquote className="border-l-4 border-primary pl-6 italic text-muted-foreground my-8">
                "This represents a significant milestone in our collective effort to address global challenges through cooperation and shared responsibility."
              </blockquote>
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">Related Topics:</span>
              <span className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">
                {article.category}
              </span>
              <span className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">
                Breaking News
              </span>
              <span className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">
                Analysis
              </span>
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="max-w-4xl mx-auto mt-12 pt-12 border-t border-border">
            <h2 className="headline-md mb-6">Related Stories</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
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
