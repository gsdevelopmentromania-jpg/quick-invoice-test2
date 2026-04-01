export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  readingTimeMinutes: number;
  category: string;
  tags: string[];
  author: string;
  featured: boolean;
}
