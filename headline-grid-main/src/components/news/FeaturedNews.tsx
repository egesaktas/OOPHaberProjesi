import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { NewsArticle } from '@/types';
import { CategoryBadge } from './CategoryBadge';

interface FeaturedNewsProps {
  article: NewsArticle;
}

export function FeaturedNews({ article }: FeaturedNewsProps) {
  const timeAgo = formatDistanceToNow(new Date(article.created_at), { addSuffix: true });

  return (
    <Link to={`/news/${article.id}`} className="group block">
      <article className="news-card-featured aspect-[16/9] md:aspect-[21/9]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-background" />
        {article.image_url && (
          <img
            src={article.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="gradient-overlay" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <div className="max-w-3xl space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="live-indicator">Live</span>
              <CategoryBadge category={article.category} className="bg-white/20 text-white backdrop-blur-sm" />
            </div>
            <h1 className="font-serif text-2xl md:text-4xl lg:text-5xl font-bold text-white leading-tight text-balance">
              {article.title}
            </h1>
            {article.summary && (
              <p className="text-white/90 text-lg hidden md:block max-w-2xl">
                {article.summary}
              </p>
            )}
            <div className="flex items-center gap-4 text-white/70 text-sm">
              <span>{timeAgo}</span>
              {article.author_name && (
                <>
                  <span>•</span>
                  <span>By {article.author_name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
