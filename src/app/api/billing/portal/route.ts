import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import stripe from "@/lib/stripe";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";
import { unauthorized, badRequest, serverError } from "@/lib/errors";

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session so the user can manage their subscription.
 */
export async function POST(_req: NextRequest): Promise<NextResponse<ApiResponse<{ url: string }>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return badRequest("No billing account found. Please upgrade to a paid plan first.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/settings?tab=billing`,
    });

    return NextResponse.json({ data: { url: portalSession.url } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[billing/portal] error:", err);
    return serverError(message);
  }
}
