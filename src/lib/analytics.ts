declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | boolean | number> }
    ) => void;
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

export type SignupProperties = { method: "email" | "google" | "github" };
export type TrialStartProperties = { plan: string };
export type UpgradeProperties = { plan: string; from_plan: string };
export type InvoiceSentProperties = { has_payment_link: boolean };
export type InvoiceViewedProperties = { invoice_id: string };

export type AnalyticsEvent =
  | { name: "signup"; properties: SignupProperties }
  | { name: "trial_start"; properties: TrialStartProperties }
  | { name: "upgrade"; properties: UpgradeProperties }
  | { name: "invoice_sent"; properties: InvoiceSentProperties }
  | { name: "invoice_viewed"; properties: InvoiceViewedProperties }
  | { name: "invoice_paid"; properties: Record<string, never> }
  | { name: "checkout_started"; properties: { plan: string } };

function serializeProperties(
  props: Record<string, unknown>
): Record<string, string | boolean | number> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(props)) {
    result[key] = String(props[key]);
  }
  return result;
}

export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  const { name, properties } = event;

  if (window.gtag && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    window.gtag("event", name, properties as Record<string, unknown>);
  }

  if (window.plausible) {
    window.plausible(name, {
      props: serializeProperties(properties as Record<string, unknown>),
    });
  }

  if (window.posthog) {
    window.posthog.capture(name, properties as Record<string, unknown>);
  }
}

export function trackSignup(method: SignupProperties["method"]): void {
  trackEvent({ name: "signup", properties: { method } });
}

export function trackTrialStart(plan: string): void {
  trackEvent({ name: "trial_start", properties: { plan } });
}

export function trackUpgrade(plan: string, fromPlan: string): void {
  trackEvent({ name: "upgrade", properties: { plan, from_plan: fromPlan } });
}

export function trackInvoiceSent(hasPaymentLink: boolean): void {
  trackEvent({
    name: "invoice_sent",
    properties: { has_payment_link: hasPaymentLink },
  });
}

export function trackCheckoutStarted(plan: string): void {
  trackEvent({ name: "checkout_started", properties: { plan } });
}
