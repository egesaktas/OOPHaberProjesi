import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/news/CategoryBadge';
import { bundleSources } from '@/data/mockNews';

const Bundle = () => {
  const sources = Object.entries(bundleSources);

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
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        </div>

        {/* Bundle Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {sources.map(([sourceName, articles]) => (
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
                {articles.map((article) => (
                  <article
                    key={article.id}
                    className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                  >
                    <CategoryBadge category={article.category} className="mb-2" />
                    <h3 className="font-serif font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="meta-text mt-2">{article.time}</p>
                  </article>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-secondary/50 border-t border-border">
                <button className="text-sm text-primary font-medium hover:underline">
                  View more from {sourceName}
                </button>
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
