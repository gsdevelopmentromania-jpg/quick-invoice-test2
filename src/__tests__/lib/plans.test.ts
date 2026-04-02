/**
 * Unit tests for src/lib/plans.ts
 *
 * Covers: PLAN_CONFIGS shape, getPlanConfig, plan limits and features.
 */

import { PLAN_CONFIGS, getPlanConfig } from "@/lib/plans";

describe("PLAN_CONFIGS", () => {
  it("contains all three plans: FREE, PRO, TEAM", () => {
    expect(Object.keys(PLAN_CONFIGS)).toEqual(
      expect.arrayContaining(["FREE", "PRO", "TEAM"])
    );
  });

  describe("FREE plan", () => {
    const plan = PLAN_CONFIGS.FREE;

    it("has id FREE", () => {
      expect(plan.id).toBe("FREE");
    });

    it("has zero monthly price", () => {
      expect(plan.monthlyPriceUsd).toBe(0);
    });

    it("has null annual price", () => {
      expect(plan.annualPriceUsd).toBeNull();
    });

    it("limits invoices to 3 per month", () => {
      expect(plan.limits.invoicesPerMonth).toBe(3);
    });

    it("limits clients to 5", () => {
      expect(plan.limits.clients).toBe(5);
    });

    it("has no PDF downloads", () => {
      expect(plan.features.pdfDownloads).toBe(false);
    });

    it("has no payment reminders", () => {
      expect(plan.features.paymentReminders).toBe(false);
    });

    it("has zero trial days", () => {
      expect(plan.features.trialDays).toBe(0);
    });

    it("limits team to 1 member", () => {
      expect(plan.features.maxTeamMembers).toBe(1);
    });

    it("has at least one highlight string", () => {
      expect(plan.highlights.length).toBeGreaterThan(0);
    });
  });

  describe("PRO plan", () => {
    const plan = PLAN_CONFIGS.PRO;

    it("has id PRO", () => {
      expect(plan.id).toBe("PRO");
    });

    it("has a positive monthly price", () => {
      expect(plan.monthlyPriceUsd).toBeGreaterThan(0);
    });

    it("has unlimited invoices (null limit)", () => {
      expect(plan.limits.invoicesPerMonth).toBeNull();
    });

    it("has unlimited clients (null limit)", () => {
      expect(plan.limits.clients).toBeNull();
    });

    it("includes PDF downloads", () => {
      expect(plan.features.pdfDownloads).toBe(true);
    });

    it("includes payment reminders", () => {
      expect(plan.features.paymentReminders).toBe(true);
    });

    it("has a 14-day trial", () => {
      expect(plan.features.trialDays).toBe(14);
    });

    it("has priority support", () => {
      expect(plan.features.prioritySupport).toBe(true);
    });

    it("has a valid annual price", () => {
      expect(plan.annualPriceUsd).not.toBeNull();
      expect(plan.annualPriceUsd as number).toBeGreaterThan(0);
    });
  });

  describe("TEAM plan", () => {
    const plan = PLAN_CONFIGS.TEAM;

    it("has id TEAM", () => {
      expect(plan.id).toBe("TEAM");
    });

    it("has unlimited invoices", () => {
      expect(plan.limits.invoicesPerMonth).toBeNull();
    });

    it("has unlimited clients", () => {
      expect(plan.limits.clients).toBeNull();
    });

    it("has null maxTeamMembers (unlimited)", () => {
      expect(plan.features.maxTeamMembers).toBeNull();
    });

    it("costs more than PRO per month", () => {
      expect(PLAN_CONFIGS.TEAM.monthlyPriceUsd).toBeGreaterThan(
        PLAN_CONFIGS.PRO.monthlyPriceUsd
      );
    });
  });
});

describe("getPlanConfig", () => {
  it("returns the correct config for FREE", () => {
    const config = getPlanConfig("FREE");
    expect(config).toBe(PLAN_CONFIGS.FREE);
    expect(config.id).toBe("FREE");
  });

  it("returns the correct config for PRO", () => {
    const config = getPlanConfig("PRO");
    expect(config).toBe(PLAN_CONFIGS.PRO);
    expect(config.id).toBe("PRO");
  });

  it("returns the correct config for TEAM", () => {
    const config = getPlanConfig("TEAM");
    expect(config).toBe(PLAN_CONFIGS.TEAM);
    expect(config.id).toBe("TEAM");
  });

  it("returns a config with a non-empty name", () => {
    expect(getPlanConfig("FREE").name.length).toBeGreaterThan(0);
    expect(getPlanConfig("PRO").name.length).toBeGreaterThan(0);
    expect(getPlanConfig("TEAM").name.length).toBeGreaterThan(0);
  });
});
