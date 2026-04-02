import Stripe from "stripe";

/**
 * Lazily-initialized Stripe client.
 *
 * Using a module-level throw for a missing env var crashes the Next.js build
 * in preview/CI environments that don't set STRIPE_SECRET_KEY at build time.
 * Instead we fall back to an empty string so the module loads safely; any
 * actual Stripe API call will fail at runtime with a clear authentication error,
 * which is caught and handled in each route handler.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export default stripe;
