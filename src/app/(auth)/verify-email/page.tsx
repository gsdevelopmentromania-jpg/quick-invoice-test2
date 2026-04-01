"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token || !email) {
      setState("error");
      setMessage("Invalid verification link. Please check your email or request a new one.");
      return;
    }

    const url = `/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    fetch(url)
      .then((res) => res.json() as Promise<{ data?: { verified: boolean }; error?: string }>)
      .then((data) => {
        if (data.error) {
          setState("error");
          setMessage(data.error);
        } else {
          setState("success");
          setMessage("Your email has been verified. You can now sign in.");
        }
      })
      .catch(() => {
        setState("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token, email]);

  return (
    <div className="flex flex-col items-center text-center">
      {state === "loading" && (
        <>
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Verifying your email&hellip;</h2>
        </>
      )}

      {state === "success" && (
        <>
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
          <p className="mt-2 text-sm text-gray-500">{message}</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Sign in
          </Link>
        </>
      )}

      {state === "error" && (
        <>
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
          <p className="mt-2 text-sm text-gray-500">{message}</p>
          <Link
            href="/register"
            className="mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Register again
          </Link>
        </>
      )}
    </div>
  );
}
