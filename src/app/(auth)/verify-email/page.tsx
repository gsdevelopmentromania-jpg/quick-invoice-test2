"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setErrorMessage("Invalid verification link. Please request a new one.");
      return;
    }

    const params = new URLSearchParams({ token, email });

    fetch(`/api/auth/verify-email?${params.toString()}`)
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
        } else {
          const data = (await res.json()) as { error?: string };
          setErrorMessage(data.error ?? "Verification failed. Please try again.");
          setStatus("error");
        }
      })
      .catch(() => {
        setErrorMessage("Something went wrong. Please try again.");
        setStatus("error");
      });
  }, [token, email]);

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
          <svg
            className="h-6 w-6 animate-spin text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Verifying your email&hellip;</h2>
        <p className="mt-2 text-sm text-gray-500">Please wait a moment.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Email verified!</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your email has been confirmed. You can now sign in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900">Verification failed</h2>
      <p className="mt-2 text-sm text-gray-500">{errorMessage}</p>
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Sign in
        </Link>
        <p className="text-xs text-gray-400">
          Need a new link?{" "}
          <Link href="/register" className="text-indigo-600 hover:text-indigo-700">
            Sign up again
          </Link>{" "}
          or contact support.
        </p>
      </div>
    </div>
  );
}
