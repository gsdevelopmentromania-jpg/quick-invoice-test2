import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Start sending professional invoices in minutes
        </p>
      </div>

      {/* Placeholder form — implementation in a future task */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
          <div className="h-9 rounded-lg border border-gray-300 bg-gray-50 skeleton-shimmer" aria-hidden="true" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <div className="h-9 rounded-lg border border-gray-300 bg-gray-50 skeleton-shimmer" aria-hidden="true" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <div className="h-9 rounded-lg border border-gray-300 bg-gray-50 skeleton-shimmer" aria-hidden="true" />
        </div>
        <div className="h-9 rounded-lg bg-indigo-200 skeleton-shimmer" aria-hidden="true" />

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-xs text-gray-400">or sign up with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="h-9 rounded-lg border border-gray-200 skeleton-shimmer" aria-hidden="true" />
          <div className="h-9 rounded-lg border border-gray-200 skeleton-shimmer" aria-hidden="true" />
        </div>

        <p className="text-xs text-gray-400 text-center">
          By signing up you agree to our{" "}
          <Link href="/terms" className="text-indigo-600 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-indigo-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign in
        </Link>
      </p>
    </div>
  );
}
