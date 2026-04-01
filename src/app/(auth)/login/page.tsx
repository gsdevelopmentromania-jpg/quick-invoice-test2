import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to your Quick Invoice account</p>
      </div>

      {/* Placeholder form — implementation in a future task */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
            Email address
          </label>
          <div className="h-9 rounded-lg border border-gray-300 bg-gray-50 skeleton-shimmer" aria-hidden="true" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
            Password
          </label>
          <div className="h-9 rounded-lg border border-gray-300 bg-gray-50 skeleton-shimmer" aria-hidden="true" />
        </div>
        <div className="h-9 rounded-lg bg-indigo-200 skeleton-shimmer" aria-hidden="true" />

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-xs text-gray-400">or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="h-9 rounded-lg border border-gray-200 skeleton-shimmer" aria-hidden="true" />
          <div className="h-9 rounded-lg border border-gray-200 skeleton-shimmer" aria-hidden="true" />
        </div>
      </div>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
