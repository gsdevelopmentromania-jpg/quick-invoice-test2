/**
 * Billing API route tests.
 * Covers: /api/billing/subscription, /api/billing/checkout, /api/billing/cancel, /api/billing/reactivate
 */

import { NextRequest } from "next/server";

// ── Mock dependencies ──────────────────────────────────────────────────────

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    invoice: { count: jest.fn() },
    client: { count: jest.fn() },
    subscription: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(
      (fn: (tx: unknown) => Promise<unknown>) => fn({})
    ),
  },
}));

jest.mock("@/lib/stripe", () => ({
  __esModule: true,
  default: {
    checkout: {
      sessions: { create: jest.fn() },
    },
    billingPortal: {
      sessions: { create: jest.fn() },
    },
    customers: { create: jest.fn() },
    subscriptions: { update: jest.fn(), retrieve: jest.fn() },
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockStripe = stripe as any;

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/billing/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const MOCK_USER_SESSION = {
  user: { id: "user-1", email: "test@example.com", name: "Test User" },
};

const MOCK_SUBSCRIPTION = {
  id: "sub-db-1",
  userId: "user-1",
  stripeSubscriptionId: "sub_stripe_123",
  stripePriceId: "price_pro_123",
  plan: "PRO",
  status: "ACTIVE",
  currentPeriodStart: new Date("2026-01-01"),
  currentPeriodEnd: new Date("2026-02-01"),
  cancelAtPeriodEnd: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

// ── /api/billing/subscription ──────────────────────────────────────────────

describe("GET /api/billing/subscription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/billing/subscription/route");
    const res = await GET(new NextRequest("http://localhost/api/billing/subscription"));
    expect(res.status).toBe(401);
  });

  it("returns subscription details for authenticated user", async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_USER_SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      plan: "PRO",
      stripeCustomerId: "cus_123",
    });
    mockPrisma.subscription.findFirst.mockResolvedValueOnce(MOCK_SUBSCRIPTION);
    mockPrisma.invoice.count.mockResolvedValueOnce(5);
    mockPrisma.client.count.mockResolvedValueOnce(10);

    const { GET } = await import("@/app/api/billing/subscription/route");
    const res = await GET(new NextRequest("http://localhost/api/billing/subscription"));
    const body = (await res.json()) as { data?: { plan: string; planName: string } };

    expect(res.status).toBe(200);
    expect(body.data?.plan).toBe("PRO");
    expect(body.data?.planName).toBe("Pro");
  });

  it("returns free plan details when no subscription exists", async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_USER_SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ plan: "FREE", stripeCustomerId: null });
    mockPrisma.subscription.findFirst.mockResolvedValueOnce(null);
    mockPrisma.invoice.count.mockResolvedValueOnce(1);
    mockPrisma.client.count.mockResolvedValueOnce(2);

    const { GET } = await import("@/app/api/billing/subscription/route");
    const res = await GET(new NextRequest("http://localhost/api/billing/subscription"));
    const body = (await res.json()) as {
      data?: {
        plan: string;
        usage: { invoicesLimit: number | null };
      };
    };

    expect(res.status).toBe(200);
    expect(body.data?.plan).toBe("FREE");
    expect(body.data?.usage.invoicesLimit).toBe(3);
  });
});

// ── /api/billing/checkout ──────────────────────────────────────────────────

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_PRO_PRICE_ID = "price_pro_test";
    process.env.STRIPE_TEAM_PRICE_ID = "price_team_test";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/billing/checkout/route");
    const res = await POST(makeRequest({ plan: "PRO" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for FREE plan", async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_USER_SESSION);
    const { POST } = await import("@/app/api/billing/checkout/route");
    const res = await POST(makeRequest({ plan: "FREE" }));
    expect(res.status).toBe(400);
  });

  it("returns checkout URL for PRO plan", async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_USER_SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ stripeCustomerId: "cus_abc" });
    mockStripe.checkout.sessions.create.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/pay/cs_test_123",
    });

    const { POST } = await import("@/app/api/billing/checkout/route");
    const res = await POST(makeRequest({ plan: "PRO", withTrial: true }));
    const body = (await res.json()) as { data?: { url: string } };

    expect(res.status).toBe(200);
    expect(body.data?.url).toContain("checkout.stripe.com");
  });
});

// ── /api/billing/cancel ────────────────────────────────────────────────────

describe("POST /api/billing/cancel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/billing/cancel/route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 when no active subscription", async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_USER_SESSION);
    mockPrisma.subscription.findFirst.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/billing/cancel/route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("cancels subscription at period end", async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_USER_SESSION);
    mockPrisma.subscription.findFirst.mockResolvedValueOnce(MOCK_SUBSCRIPTION);
    mockStripe.subscriptions.update.mockResolvedValueOnce({});
    mockPrisma.subscription.update.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/billing/cancel/route");
    const res = await POST(makeRequest());
    const body = (await res.json()) as { data?: { message: string } };

    expect(res.status).toBe(200);
    expect(body.data?.message).toContain("cancel");
    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
      MOCK_SUBSCRIPTION.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );
  });
});

// ── /api/billing/reactivate ────────────────────────────────────────────────

describe("POST /api/billing/reactivate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/billing/reactivate/route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 when subscription is not scheduled to cancel", async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_USER_SESSION);
    mockPrisma.subscription.findFirst.mockResolvedValueOnce(MOCK_SUBSCRIPTION);

    const { POST } = await import("@/app/api/billing/reactivate/route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("reactivates a subscription scheduled to cancel", async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_USER_SESSION);
    mockPrisma.subscription.findFirst.mockResolvedValueOnce({
      ...MOCK_SUBSCRIPTION,
      cancelAtPeriodEnd: true,
    });
    mockStripe.subscriptions.update.mockResolvedValueOnce({});
    mockPrisma.subscription.update.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/billing/reactivate/route");
    const res = await POST(makeRequest());
    const body = (await res.json()) as { data?: { message: string } };

    expect(res.status).toBe(200);
    expect(body.data?.message).toContain("reactivated");
    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
      MOCK_SUBSCRIPTION.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );
  });
});

// ── PLAN_CONFIGS sanity checks ─────────────────────────────────────────────

describe("PLAN_CONFIGS", () => {
  it("FREE plan has invoicesPerMonth limit", async () => {
    const { PLAN_CONFIGS } = await import("@/lib/billing");
    expect(PLAN_CONFIGS.FREE.limits.invoicesPerMonth).toBe(3);
  });

  it("PRO plan has no invoice limit", async () => {
    const { PLAN_CONFIGS } = await import("@/lib/billing");
    expect(PLAN_CONFIGS.PRO.limits.invoicesPerMonth).toBeNull();
  });

  it("PRO plan has PDF downloads enabled", async () => {
    const { PLAN_CONFIGS } = await import("@/lib/billing");
    expect(PLAN_CONFIGS.PRO.features.pdfDownloads).toBe(true);
  });

  it("FREE plan has PDF downloads disabled", async () => {
    const { PLAN_CONFIGS } = await import("@/lib/billing");
    expect(PLAN_CONFIGS.FREE.features.pdfDownloads).toBe(false);
  });
});
