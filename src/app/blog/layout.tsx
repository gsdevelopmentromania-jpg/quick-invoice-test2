import Link from "next/link";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <nav className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
            Quick Invoice
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Blog
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <main className="px-6 py-12">
        <article className="mx-auto max-w-2xl prose prose-gray dark:prose-invert">
          {children}
        </article>
      </main>

      <footer className="border-t border-gray-100 dark:border-gray-800 px-6 py-8 mt-16">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2026 Quick Invoice. Built for freelancers.
          </p>
          <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/pricing" className="hover:text-gray-900 dark:hover:text-white">
              Pricing
            </Link>
            <Link href="/blog" className="hover:text-gray-900 dark:hover:text-white">
              Blog
            </Link>
            <Link href="/register" className="hover:text-gray-900 dark:hover:text-white">
              Sign up free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
