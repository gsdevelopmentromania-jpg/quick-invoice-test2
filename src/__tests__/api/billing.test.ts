/**
 * Integration tests for billing API routes.
 *
 * Prisma and Stripe are mocked — no real external calls.
 * Tests cover the free → trial → upgrade → downgrade → cancel flow.
 */

import { NextRequest } from "next/server";

// ─── Mocks (declared before imports that use them) ──────────────────────────

const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

const mockStripe = {
  customers: {
    create: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
  subscriptions: {
    update: jest.fn(),
    retrieve: jest.fn(),
  },
  billingPortal: {
    sessions: {
      create: jest.fn(),
    },
  },
};

jest.mock("@/lib/stripe", () => ({ __esModule: true, default: mockStripe }));

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
  },
  invoice: {
    count: jest.fn(),
  },
  client: {
    count: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(
    (arg: ((tx: typeof prismaMock) => Promise<unknown>) | Array<Promise<unknown>>) => {
      if (typeof arg === "function") return arg(prismaMock);
      return Promise.all(arg);
    }
  ),
};

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: prismaMock }));

// ─── Imports (after mocks are hoisted) ───────────────────────────────────────

import { GET as getSubscription } from "@/app/api/billing/subscription/route";
import { POST as postCheckout } from "@/app/api/billing/checkout/route";
import { POST as postCancel } from "@/app/api/billing/cancel/route";
import { POST as postReactivate } from "@/app/api/billing/reactivate/route";
import { POST as postPortal } from "@/app/api/billing/portal/route";
import { POST as postUpgrade } from "@/app/api/billing/upgrade/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSION = {
  user: { id: "user-abc", email: "test@example.com", name: "Test User" },
};

const ACTIVE_SUB = {
  id: "sub-001",
  userId: "user-abc",
  stripeSubscriptionId: "sub_stripe_001",
  stripePriceId: "price_pro_001",
  plan: "PRO",
  status: "ACTIVE",
  currentPeriodStart: new Date("2026-03-01"),
  currentPeriodEnd: new Date("2026-04-01"),
  cancelAtPeriodEnd: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const TRIAL_SUB = {
  ...ACTIVE_SUB,
  status: "TRIALING",
  currentPeriodEnd: new Date("2026-04-15"),
};

const CANCEL_PENDING_SUB = {
  ...ACTIVE_SUB,
  cancelAtPeriodEnd: true,
};

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000").toString(), {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function resetMocks(): void {
  mockGetServerSession.mockReset();
  mockStripe.customers.create.mockReset();
  mockStripe.checkout.sessions.create.mockReset();
  mockStripe.subscriptions.update.mockReset();
  mockStripe.subscriptions.retrieve.mockReset();
  mockStripe.billingPortal.sessions.create.mockReset();
  prismaMock.user.findUnique.mockReset();
  prismaMock.user.update.mockReset();
  prismaMock.user.findFirst.mockReset();
  prismaMock.subscription.findFirst.mockReset();
  prismaMock.subscription.findUnique.mockReset();
  prismaMock.subscription.update.mockReset();
  prismaMock.subscription.updateMany.mockReset();
  prismaMock.subscription.upsert.mockReset();
  prismaMock.invoice.count.mockReset();
  prismaMock.client.count.mockReset();
  prismaMock.$transaction.mockReset();
  prismaMock.$transaction.mockImplementation(
    (arg: ((tx: typeof prismaMock) => Promise<unknown>) | Array<Promise<unknown>>) => {
      if (typeof arg === "function") return arg(prismaMock);
      return Promise.all(arg);
    }
  );
}

beforeEach(resetMocks);

// Set env vars needed for price lookups
beforeAll(() => {
  process.env.STRIPE_PRO_PRICE_ID = "price_pro_test";
  process.env.STRIPE_TEAM_PRICE_ID = "price_team_test";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
});

// ─── GET /api/billing/subscription ───────────────────────────────────────────

describe("GET /api/billing/subscription", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await getSubscription(makeRequest("/api/billing/subscription"));
    expect(res.status).toBe(401);
  });

  it("returns FREE plan details for a new user with no subscription", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ plan: "FREE", stripeCustomerId: null });
    prismaMock.subscription.findFirst.mockResolvedValue(null);
    prismaMock.invoice.count.mockResolvedValue(2);
    prismaMock.client.count.mockResolvedValue(3);

    const res = await getSubscription(makeRequest("/api/billing/subscription"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.plan).toBe("FREE");
    expect(body.data.planName).toBe("Free");
    expect(body.data.status).toBeNull();
    expect(body.data.hasStripeCustomer).toBe(false);
    expect(body.data.usage.invoicesThisMonth).toBe(2);
    expect(body.data.usage.invoicesLimit).toBe(3);
    expect(body.data.usage.totalClients).toBe(3);
    expect(body.data.usage.clientsLimit).toBe(5);
  });

  it("returns PRO plan details with active subscription", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ plan: "PRO", stripeCustomerId: "cus_001" });
    prismaMock.subscription.findFirst.mockResolvedValue(ACTIVE_SUB);
    prismaMock.invoice.count.mockResolvedValue(5);
    prismaMock.client.count.mockResolvedValue(10);

    const res = await getSubscription(makeRequest("/api/billing/subscription"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.plan).toBe("PRO");
    expect(body.data.planName).toBe("Pro");
    expect(body.data.status).toBe("ACTIVE");
    expect(body.data.cancelAtPeriodEnd).toBe(false);
    expect(body.data.hasStripeCustomer).toBe(true);
    expect(body.data.usage.invoicesLimit).toBeNull(); // PRO = unlimited
  });

  it("returns trialEnd when subscription is in trial", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ plan: "PRO", stripeCustomerId: "cus_001" });
    prismaMock.subscription.findFirst.mockResolvedValue(TRIAL_SUB);
    prismaMock.invoice.count.mockResolvedValue(0);
    prismaMock.client.count.mockResolvedValue(0);

    const res = await getSubscription(makeRequest("/api/billing/subscription"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("TRIALING");
    expect(body.data.trialEnd).not.toBeNull();
  });
});

// ─── POST /api/billing/checkout ───────────────────────────────────────────────

describe("POST /api/billing/checkout", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await postCheckout(
      makeRequest("/api/billing/checkout", { method: "POST", body: { plan: "PRO" } })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when plan is FREE", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await postCheckout(
      makeRequest("/api/billing/checkout", { method: "POST", body: { plan: "FREE" } })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Free");
  });

  it("returns 400 for invalid body", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await postCheckout(
      makeRequest("/api/billing/checkout", { method: "POST", body: { plan: "INVALID" } })
    );
    expect(res.status).toBe(400);
  });

  it("creates checkout session with trial for PRO plan", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    // User already has a Stripe customer ID
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_001" });
    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test_xxx",
    });

    const res = await postCheckout(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { plan: "PRO", withTrial: true },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.url).toContain("checkout.stripe.com");

    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_001",
        mode: "subscription",
        payment_method_collection: "if_required", // trial = no card required
      })
    );
  });

  it("creates a new Stripe customer if none exists", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    // No existing customer
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: null });
    mockStripe.customers.create.mockResolvedValue({ id: "cus_new_001" });
    prismaMock.user.update.mockResolvedValue({});
    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test_yyy",
    });

    const res = await postCheckout(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { plan: "PRO", withTrial: false },
      })
    );
    expect(res.status).toBe(200);
    expect(mockStripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: SESSION.user.email })
    );
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_collection: "always", // no trial
      })
    );
  });
});

// ─── POST /api/billing/cancel ────────────────────────────────────────────────

describe("POST /api/billing/cancel", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await postCancel(makeRequest("/api/billing/cancel", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no active subscription exists", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.subscription.findFirst.mockResolvedValue(null);

    const res = await postCancel(makeRequest("/api/billing/cancel", { method: "POST" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No active subscription");
  });

  it("schedules cancellation at period end", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.subscription.findFirst.mockResolvedValue(ACTIVE_SUB);
    mockStripe.subscriptions.update.mockResolvedValue({});
    prismaMock.subscription.update.mockResolvedValue({});

    const res = await postCancel(makeRequest("/api/billing/cancel", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.message).toContain("end of the billing period");

    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith("sub_stripe_001", {
      cancel_at_period_end: true,
    });
    expect(prismaMock.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { cancelAtPeriodEnd: true },
      })
    );
  });
});

// ─── POST /api/billing/reactivate ────────────────────────────────────────────

describe("POST /api/billing/reactivate", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await postReactivate(makeRequest("/api/billing/reactivate", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no active subscription exists", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.subscription.findFirst.mockResolvedValue(null);

    const res = await postReactivate(makeRequest("/api/billing/reactivate", { method: "POST" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when subscription is not pending cancellation", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.subscription.findFirst.mockResolvedValue(ACTIVE_SUB); // cancelAtPeriodEnd = false

    const res = await postReactivate(makeRequest("/api/billing/reactivate", { method: "POST" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not scheduled to cancel");
  });

  it("removes pending cancellation and reactivates subscription", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.subscription.findFirst.mockResolvedValue(CANCEL_PENDING_SUB);
    mockStripe.subscriptions.update.mockResolvedValue({});
    prismaMock.subscription.update.mockResolvedValue({});

    const res = await postReactivate(makeRequest("/api/billing/reactivate", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.message).toContain("reactivated");

    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith("sub_stripe_001", {
      cancel_at_period_end: false,
    });
  });
});

// ─── POST /api/billing/portal ────────────────────────────────────────────────

describe("POST /api/billing/portal", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await postPortal(makeRequest("/api/billing/portal", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when user has no Stripe customer", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: null });

    const res = await postPortal(makeRequest("/api/billing/portal", { method: "POST" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No billing account");
  });

  it("creates portal session and returns URL", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_001" });
    mockStripe.billingPortal.sessions.create.mockResolvedValue({
      url: "https://billing.stripe.com/session/bps_test_xxx",
    });

    const res = await postPortal(makeRequest("/api/billing/portal", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.url).toContain("billing.stripe.com");

    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_001" })
    );
  });
});

// ─── POST /api/billing/upgrade ───────────────────────────────────────────────

describe("POST /api/billing/upgrade", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await postUpgrade(
      makeRequest("/api/billing/upgrade", { method: "POST", body: { plan: "TEAM" } })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when plan is FREE", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await postUpgrade(
      makeRequest("/api/billing/upgrade", { method: "POST", body: { plan: "FREE" } })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Free");
  });

  it("returns 400 when no active subscription exists", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.subscription.findFirst.mockResolvedValue(null);

    const res = await postUpgrade(
      makeRequest("/api/billing/upgrade", { method: "POST", body: { plan: "TEAM" } })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No active subscription");
  });

  it("returns 400 when user is already on the target plan", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.subscription.findFirst.mockResolvedValue(ACTIVE_SUB); // plan: PRO

    const res = await postUpgrade(
      makeRequest("/api/billing/upgrade", { method: "POST", body: { plan: "PRO" } })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("already on this plan");
  });

  it("upgrades PRO to TEAM with prorations", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.subscription.findFirst.mockResolvedValue(ACTIVE_SUB); // plan: PRO
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      items: { data: [{ id: "si_test_001" }] },
    });
    mockStripe.subscriptions.update.mockResolvedValue({});

    const res = await postUpgrade(
      makeRequest("/api/billing/upgrade", { method: "POST", body: { plan: "TEAM" } })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.message).toContain("TEAM");

    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
      "sub_stripe_001",
      expect.objectContaining({
        items: [{ id: "si_test_001", price: "price_team_test" }],
        proration_behavior: "create_prorations",
      })
    );
  });

  it("downgrades TEAM to PRO with prorations", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const teamSub = { ...ACTIVE_SUB, plan: "TEAM", stripePriceId: "price_team_test" };
    prismaMock.subscription.findFirst.mockResolvedValue(teamSub);
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      items: { data: [{ id: "si_test_002" }] },
    });
    mockStripe.subscriptions.update.mockResolvedValue({});

    const res = await postUpgrade(
      makeRequest("/api/billing/upgrade", { method: "POST", body: { plan: "PRO" } })
    );
    expect(res.status).toBe(200);

    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
      "sub_stripe_001",
      expect.objectContaining({
        items: [{ id: "si_test_002", price: "price_pro_test" }],
      })
    );
  });
});
