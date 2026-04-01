import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

/**
 * Thrown within DAL / service functions and caught at the route boundary.
 * Routes may call the response helpers below instead if preferred.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Response helpers ──────────────────────────────────────────────────────

export function unauthorized<T = never>(): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden<T = never>(message = "Forbidden"): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound<T = never>(resource = "Resource"): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function badRequest<T = never>(message: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function conflict<T = never>(message: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError<T = never>(
  message = "Internal server error"
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function ok<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data }, { status: 200 });
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * Wrap a route handler body with standard error handling.
 * Catches ApiError instances and generic errors; returns consistent JSON.
 */
export async function withErrorHandler<T>(
  fn: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiResponse<never>>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message } as ApiResponse<never>,
        { status: err.statusCode }
      );
    }
    console.error("Unhandled route error:", err);
    return NextResponse.json(
      { error: "Internal server error" } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
