import { TrendingUp } from 'lucide-react';
import { NewsArticle } from '@/types';
import { NewsCard } from './NewsCard';

interface TrendingSidebarProps {
  articles: NewsArticle[];
}

export function TrendingSidebar({ articles }: TrendingSidebarProps) {
  return (
    <aside className="bg-card rounded-lg p-4 border border-border">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="font-serif font-bold text-lg">Trending Now</h2>
      </div>
      <div className="space-y-0">
        {articles.slice(0, 5).map((article, index) => (
          <div key={article.id} className="relative">
            <span className="absolute -left-2 top-4 font-serif font-bold text-2xl text-muted-foreground/30">
              {index + 1}
            </span>
            <div className="pl-6">
              <NewsCard article={article} variant="compact" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
