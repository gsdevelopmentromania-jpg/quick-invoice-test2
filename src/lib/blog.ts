import type { BlogPost } from "@/types/blog";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-invoice-clients-as-a-freelancer",
    title: "How to Invoice Clients as a Freelancer: The Complete 2026 Guide",
    description:
      "Learn exactly how to invoice clients as a freelancer — from what to include on every invoice to setting payment terms that get you paid faster.",
    publishedAt: "2026-04-01",
    readingTimeMinutes: 9,
    category: "Guides",
    tags: ["invoicing", "freelancing", "getting paid", "payment terms"],
    author: "Quick Invoice Team",
    featured: true,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getFeaturedPosts(): BlogPost[] {
  return BLOG_POSTS.filter((post) => post.featured);
}
