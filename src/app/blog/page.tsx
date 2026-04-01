import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Freelance Invoicing Blog — Tips, Guides & Best Practices | Quick Invoice",
  description:
    "Practical guides for freelancers on invoicing, getting paid faster, setting payment terms, and running a professional billing workflow.",
  path: "/blog",
});

export default function BlogPage(): React.ReactElement {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-16 text-center border-b border-gray-100">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Freelance Invoicing Blog
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Practical guides to get paid faster, invoice professionally, and
            build a billing workflow that works.
          </p>
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-2xl space-y-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="border border-gray-100 rounded-xl p-6 hover:border-indigo-200 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                  {post.category}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span className="text-xs text-gray-400">
                  · {post.readingTimeMinutes} min read
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 leading-snug">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-indigo-600 transition"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {post.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Read article →
              </Link>
            </article>
          ))}
        </div>

        <div className="mx-auto max-w-2xl mt-16 text-center rounded-2xl bg-indigo-50 p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Ready to invoice faster?
          </h2>
          <p className="text-gray-600 mb-6">
            Create your first invoice in under two minutes. Free forever on the
            starter plan.
          </p>
          <Link
            href="/register"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Send your first invoice →
          </Link>
        </div>
      </section>
    </div>
  );
}
