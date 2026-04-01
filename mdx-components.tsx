import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-8 mb-4 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-gray-700 leading-relaxed mb-5">{children}</p>
    ),
    a: ({ href, children }) => (
      <Link
        href={href ?? "#"}
        className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
      >
        {children}
      </Link>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-outside pl-6 space-y-2 mb-5 text-gray-700">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside pl-6 space-y-2 mb-5 text-gray-700">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-indigo-500 pl-5 italic text-gray-600 my-6">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
    hr: () => <hr className="my-8 border-gray-200" />,
    ...components,
  };
}
