/**
 * Unit tests for src/lib/errors.ts
 *
 * Covers: ApiError, HTTP response helpers, withErrorHandler
 */

import {
  ApiError,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  conflict,
  serverError,
  ok,
  created,
  withErrorHandler,
} from "@/lib/errors";

// ─── ApiError ────────────────────────────────────────────────────────────────

describe("ApiError", () => {
  it("stores message and default status 500", () => {
    const err = new ApiError("Something went wrong");
    expect(err.message).toBe("Something went wrong");
    expect(err.statusCode).toBe(500);
  });

  it("stores custom status code", () => {
    const err = new ApiError("Not found", 404);
    expect(err.statusCode).toBe(404);
  });

  it("is an instance of Error", () => {
    expect(new ApiError("boom")).toBeInstanceOf(Error);
  });

  it("has name ApiError", () => {
    expect(new ApiError("boom").name).toBe("ApiError");
  });
});

// ─── Response helpers ─────────────────────────────────────────────────────────

describe("unauthorized", () => {
  it("returns 401 status", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
  });

  it("returns error body with Unauthorized", async () => {
    const body = await unauthorized().json();
    expect(body.error).toBe("Unauthorized");
  });
});

describe("forbidden", () => {
  it("returns 403 status", () => {
    expect(forbidden().status).toBe(403);
  });

  it("uses default message Forbidden", async () => {
    const body = await forbidden().json();
    expect(body.error).toBe("Forbidden");
  });

  it("accepts custom message", async () => {
    const body = await forbidden("Access denied").json();
    expect(body.error).toBe("Access denied");
  });
});

describe("notFound", () => {
  it("returns 404 status", () => {
    expect(notFound().status).toBe(404);
  });

  it("uses default resource name", async () => {
    const body = await notFound().json();
    expect(body.error).toContain("not found");
  });

  it("uses provided resource name", async () => {
    const body = await notFound("Invoice").json();
    expect(body.error).toBe("Invoice not found");
  });
});

describe("badRequest", () => {
  it("returns 400 status", () => {
    expect(badRequest("Invalid input").status).toBe(400);
  });

  it("includes the provided message", async () => {
    const body = await badRequest("Email is invalid").json();
    expect(body.error).toBe("Email is invalid");
  });
});

describe("conflict", () => {
  it("returns 409 status", () => {
    expect(conflict("Already exists").status).toBe(409);
  });

  it("includes the provided message", async () => {
    const body = await conflict("Duplicate entry").json();
    expect(body.error).toBe("Duplicate entry");
  });
});

describe("serverError", () => {
  it("returns 500 status", () => {
    expect(serverError().status).toBe(500);
  });

  it("uses default message", async () => {
    const body = await serverError().json();
    expect(body.error).toBe("Internal server error");
  });

  it("accepts custom message", async () => {
    const body = await serverError("Database unavailable").json();
    expect(body.error).toBe("Database unavailable");
  });
});

describe("ok", () => {
  it("returns 200 status", () => {
    expect(ok({ id: 1 }).status).toBe(200);
  });

  it("wraps data in data key", async () => {
    const body = await ok({ id: 1 }).json();
    expect(body.data).toEqual({ id: 1 });
  });
});

describe("created", () => {
  it("returns 201 status", () => {
    expect(created({ id: 1 }).status).toBe(201);
  });

  it("wraps data in data key", async () => {
    const body = await created({ id: "new" }).json();
    expect(body.data).toEqual({ id: "new" });
  });
});

// ─── withErrorHandler ─────────────────────────────────────────────────────────

describe("withErrorHandler", () => {
  it("returns handler result on success", async () => {
    const res = await withErrorHandler(async () => ok({ success: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
  });

  it("catches ApiError and maps to its status code", async () => {
    const res = await withErrorHandler(async () => {
      throw new ApiError("Not permitted", 403);
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Not permitted");
  });

  it("catches generic Error and returns 500", async () => {
    const res = await withErrorHandler(async () => {
      throw new Error("Unexpected failure");
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });

  it("catches non-Error thrown values and returns 500", async () => {
    const res = await withErrorHandler(async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw "string error";
    });
    expect(res.status).toBe(500);
  });

  it("propagates 404 ApiError correctly", async () => {
    const res = await withErrorHandler(async () => {
      throw new ApiError("Resource not found", 404);
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Resource not found");
  });
});
