export interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  image_url: string | null;
  category: string;
  author_id: string;
  status: 'draft' | 'published';
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type AppRole = 'journalist' | 'user';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export const CATEGORIES = [
  'Politics',
  'Technology', 
  'Sports',
  'Business',
  'World',
  'Entertainment',
  'Science',
  'Health',
] as const;

export type Category = typeof CATEGORIES[number];
