import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { FeaturedNews } from '@/components/news/FeaturedNews';
import { NewsCard } from '@/components/news/NewsCard';
import { TrendingSidebar } from '@/components/news/TrendingSidebar';
import { mockNews } from '@/data/mockNews';
import { CATEGORIES } from '@/types';

const Index = () => {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');

  const featuredArticle = mockNews.find((a) => a.is_featured) || mockNews[0];
  const filteredNews = categoryFilter
    ? mockNews.filter((a) => a.category === categoryFilter)
    : mockNews;
  const latestNews = filteredNews.filter((a) => a.id !== featuredArticle.id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6">
        {/* Category Filter Pills */}
        {categoryFilter && (
          <div className="mb-6">
            <h1 className="headline-lg mb-2">{categoryFilter} News</h1>
            <p className="text-muted-foreground">
              Latest stories from {categoryFilter.toLowerCase()}
            </p>
          </div>
        )}

        {/* Featured Section */}
        {!categoryFilter && (
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
              <div className="hidden md:flex gap-2">
                {CATEGORIES.slice(0, 4).map((cat) => (
                  <a
                    key={cat}
                    href={`/?category=${cat}`}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      categoryFilter === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-accent'
                    }`}
                  >
                    {cat}
                  </a>
                ))}
              </div>
            </div>

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

            {latestNews.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No articles found in this category.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <TrendingSidebar articles={mockNews} />
            
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
                {CATEGORIES.slice(0, 4).map((cat) => (
                  <li key={cat}>
                    <a href={`/?category=${cat}`} className="hover:text-primary transition-colors">
                      {cat}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">More</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {CATEGORIES.slice(4).map((cat) => (
                  <li key={cat}>
                    <a href={`/?category=${cat}`} className="hover:text-primary transition-colors">
                      {cat}
                    </a>
                  </li>
                ))}
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
