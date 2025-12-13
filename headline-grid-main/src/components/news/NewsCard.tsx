import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ImageIcon } from 'lucide-react';
import { NewsArticle } from '@/types';
import { CategoryBadge } from './CategoryBadge';

interface NewsCardProps {
  article: NewsArticle;
  variant?: 'default' | 'compact' | 'horizontal';
}

export function NewsCard({ article, variant = 'default' }: NewsCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.created_at), { addSuffix: true });
  const thumb = (
    <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
      <ImageIcon className="h-5 w-5 text-muted-foreground" />
    </div>
  );

  if (variant === 'compact') {
    return (
      <Link to={`/news/${article.id}`} className="group block">
        <article className="flex gap-3 py-3 border-b border-border last:border-0">
          <div className="flex-1 min-w-0">
            <CategoryBadge category={article.category} className="mb-1" />
            <h3 className="font-serif font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h3>
            <p className="meta-text mt-1">{timeAgo}</p>
          </div>
          {article.image_url ? (
            <img src={article.image_url} alt="" className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
          ) : (
            thumb
          )}
        </article>
      </Link>
    );
  }

  if (variant === 'horizontal') {
    return (
      <Link to={`/news/${article.id}`} className="group block">
        <article className="news-card flex gap-4">
          {article.image_url ? (
            <img
              src={article.image_url}
              alt=""
              className="w-32 h-24 md:w-48 md:h-32 object-cover rounded-l-lg flex-shrink-0"
            />
          ) : (
            <div className="w-32 h-24 md:w-48 md:h-32 bg-muted rounded-l-lg flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 p-4">
            <CategoryBadge category={article.category} className="mb-2" />
            <h3 className="headline-sm group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h3>
            {article.summary && (
              <p className="text-muted-foreground text-sm mt-2 line-clamp-2 hidden md:block">
                {article.summary}
              </p>
            )}
            <p className="meta-text mt-2">{timeAgo}</p>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link to={`/news/${article.id}`} className="group block">
      <article className="news-card">
        {article.image_url && (
          <div className="aspect-video overflow-hidden">
            <img
              src={article.image_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        <div className="p-4">
          <CategoryBadge category={article.category} className="mb-2" />
          <h3 className="headline-sm group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
              {article.summary}
            </p>
          )}
          <div className="flex items-center justify-between mt-3">
            <p className="meta-text">{timeAgo}</p>
            {article.author_name && (
              <p className="text-sm text-muted-foreground">By {article.author_name}</p>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
