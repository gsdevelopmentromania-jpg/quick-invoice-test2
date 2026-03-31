import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quick Invoice — Invoice faster, get paid sooner",
};

export default function HomePage(): React.ReactElement {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
        Invoice sent.{" "}
        <span className="text-indigo-500">Payment on the way.</span>
      </h1>
      <p className="text-xl text-gray-500 max-w-xl mb-10">
        Create a professional invoice, collect Stripe payment, and download a clean PDF — in under
        two minutes. Built for freelancers.
      </p>
      <div className="flex gap-4">
        <Link
          href="/register"
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          Send your first invoice
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
