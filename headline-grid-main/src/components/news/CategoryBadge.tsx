import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: string;
  className?: string;
}

const categoryStyles: Record<string, string> = {
  Politics: 'category-politics',
  Technology: 'category-tech',
  Sports: 'category-sports',
  Business: 'category-business',
  World: 'category-world',
  Entertainment: 'category-entertainment',
  Science: 'category-tech',
  Health: 'category-sports',
};

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <span className={cn('category-badge', categoryStyles[category] || 'category-world', className)}>
      {category}
    </span>
  );
}
