import type { Account, AccountSegment, LimitRequest } from "./limit-types";

/**
 * Deterministic fictional accounts and limit-change requests. Times are
 * expressed as hours before the seed instant so the queue always looks current
 * without introducing randomness.
 */

type AccountFixture = {
  id: string;
  customer: string;
  email: string;
  segment: AccountSegment;
  country: string;
  dailyLimitMinor: number;
  limitSetHoursAgo: number;
  limitSetBy: string;
  peakDailyVolumeMinor: number;
};

type RequestFixture = {
  id: string;
  accountId: string;
  requestedLimitMinor: number;
  previousLimitMinor: number;
  justification: string;
  requestedBy: string;
  requestedHoursAgo: number;
  status: LimitRequest["status"];
  decision?: { author: string; hoursAgo: number; text: string };
};

const ACCOUNTS: AccountFixture[] = [
  {
    id: "ACC-20841",
    customer: "Northgate Coffee Roasters",
    email: "finance@northgate-roasters.example",
    segment: "business",
    country: "United Kingdom",
    dailyLimitMinor: 2_500_000,
    limitSetHoursAgo: 1_460,
    limitSetBy: "Dana Whitfield",
    peakDailyVolumeMinor: 2_410_000,
  },
  {
    id: "ACC-20877",
    customer: "Helix Trading BV",
    email: "treasury@helixtrading.example",
    segment: "enterprise",
    country: "Netherlands",
    dailyLimitMinor: 18_000_000,
    limitSetHoursAgo: 720,
    limitSetBy: "Dana Whitfield",
    peakDailyVolumeMinor: 11_250_000,
  },
  {
    id: "ACC-20903",
    customer: "Priya Nair",
    email: "priya.nair@example.com",
    segment: "personal",
    country: "United Kingdom",
    dailyLimitMinor: 250_000,
    limitSetHoursAgo: 4_320,
    limitSetBy: "Onboarding default",
    peakDailyVolumeMinor: 243_000,
  },
  {
    id: "ACC-20918",
    customer: "Arbor Studio Ltd",
    email: "ops@arborstudio.example",
    segment: "business",
    country: "United Kingdom",
    dailyLimitMinor: 1_000_000,
    limitSetHoursAgo: 2_150,
    limitSetBy: "Dana Whitfield",
    peakDailyVolumeMinor: 320_000,
  },
  {
    id: "ACC-20934",
    customer: "Tomas Lindqvist",
    email: "tomas.lindqvist@example.com",
    segment: "sole_trader",
    country: "Sweden",
    dailyLimitMinor: 500_000,
    limitSetHoursAgo: 96,
    limitSetBy: "Marcus Adeyemi",
    peakDailyVolumeMinor: 118_000,
  },
  {
    id: "ACC-20952",
    customer: "Vantage Freight GmbH",
    email: "accounts@vantagefreight.example",
    segment: "enterprise",
    country: "Germany",
    dailyLimitMinor: 9_000_000,
    limitSetHoursAgo: 1_010,
    limitSetBy: "Dana Whitfield",
    peakDailyVolumeMinor: 8_740_000,
  },
  {
    id: "ACC-20969",
    customer: "Saffron & Sage Catering",
    email: "hello@saffronsage.example",
    segment: "business",
    country: "United Kingdom",
    dailyLimitMinor: 750_000,
    limitSetHoursAgo: 380,
    limitSetBy: "Marcus Adeyemi",
    peakDailyVolumeMinor: 690_000,
  },
  {
    id: "ACC-20988",
    customer: "Aurora Logistics Ltd",
    email: "finance@auroralogistics.example",
    segment: "business",
    country: "Ireland",
    dailyLimitMinor: 3_200_000,
    limitSetHoursAgo: 640,
    limitSetBy: "Dana Whitfield",
    peakDailyVolumeMinor: 1_050_000,
  },
  {
    id: "ACC-21004",
    customer: "Elena Costa",
    email: "elena.costa@example.com",
    segment: "personal",
    country: "Portugal",
    dailyLimitMinor: 150_000,
    limitSetHoursAgo: 5_600,
    limitSetBy: "Onboarding default",
    peakDailyVolumeMinor: 42_000,
  },
  {
    id: "ACC-21027",
    customer: "Brightwell Dental Group",
    email: "billing@brightwelldental.example",
    segment: "business",
    country: "United Kingdom",
    dailyLimitMinor: 1_800_000,
    limitSetHoursAgo: 210,
    limitSetBy: "Marcus Adeyemi",
    peakDailyVolumeMinor: 1_760_000,
  },
];

const REQUESTS: RequestFixture[] = [
  {
    id: "LR-3184",
    accountId: "ACC-20841",
    requestedLimitMinor: 4_000_000,
    previousLimitMinor: 2_500_000,
    justification: "Wholesale contract starts Monday; current limit blocks the first settlement run.",
    requestedBy: "Marcus Adeyemi",
    requestedHoursAgo: 6,
    status: "pending",
  },
  {
    id: "LR-3186",
    accountId: "ACC-20903",
    requestedLimitMinor: 900_000,
    previousLimitMinor: 250_000,
    justification: "Customer called about a property deposit. Source of funds not yet evidenced.",
    requestedBy: "Marcus Adeyemi",
    requestedHoursAgo: 19,
    status: "pending",
  },
  {
    id: "LR-3189",
    accountId: "ACC-20952",
    requestedLimitMinor: 12_000_000,
    previousLimitMinor: 9_000_000,
    justification: "Peak volume within 3% of the limit for eleven consecutive days.",
    requestedBy: "Dana Whitfield",
    requestedHoursAgo: 30,
    status: "pending",
  },
  {
    id: "LR-3191",
    accountId: "ACC-21027",
    requestedLimitMinor: 2_400_000,
    previousLimitMinor: 1_800_000,
    justification: "Two new practices onboarded; card volume already touching the ceiling.",
    requestedBy: "Marcus Adeyemi",
    requestedHoursAgo: 44,
    status: "pending",
  },
  {
    id: "LR-3172",
    accountId: "ACC-20918",
    requestedLimitMinor: 1_000_000,
    previousLimitMinor: 400_000,
    justification: "Seasonal campaign volume, supported by twelve months of statements.",
    requestedBy: "Marcus Adeyemi",
    requestedHoursAgo: 2_180,
    status: "approved",
    decision: {
      author: "Dana Whitfield",
      hoursAgo: 2_150,
      text: "Statements reviewed, volume consistent with the request.",
    },
  },
  {
    id: "LR-3178",
    accountId: "ACC-21004",
    requestedLimitMinor: 1_500_000,
    previousLimitMinor: 150_000,
    justification: "Customer requested a ten-fold increase to send funds to a new payee.",
    requestedBy: "Marcus Adeyemi",
    requestedHoursAgo: 300,
    status: "rejected",
    decision: {
      author: "Dana Whitfield",
      hoursAgo: 288,
      text: "Pattern matches an authorised push payment scam; increase refused.",
    },
  },
];

function hoursBefore(base: number, hours: number): string {
  return new Date(base - hours * 3_600_000).toISOString();
}

export function buildAccounts(seededAt: Date): Account[] {
  const base = seededAt.getTime();
  return ACCOUNTS.map((fixture) => ({
    id: fixture.id,
    customer: fixture.customer,
    email: fixture.email,
    segment: fixture.segment,
    country: fixture.country,
    dailyLimitMinor: fixture.dailyLimitMinor,
    limitSetAt: hoursBefore(base, fixture.limitSetHoursAgo),
    limitSetBy: fixture.limitSetBy,
    peakDailyVolumeMinor: fixture.peakDailyVolumeMinor,
  }));
}

export function buildLimitRequests(seededAt: Date): LimitRequest[] {
  const base = seededAt.getTime();
  return REQUESTS.map((fixture) => ({
    id: fixture.id,
    accountId: fixture.accountId,
    requestedLimitMinor: fixture.requestedLimitMinor,
    previousLimitMinor: fixture.previousLimitMinor,
    justification: fixture.justification,
    requestedBy: fixture.requestedBy,
    requestedAt: hoursBefore(base, fixture.requestedHoursAgo),
    status: fixture.status,
    decision: fixture.decision
      ? {
          author: fixture.decision.author,
          at: hoursBefore(base, fixture.decision.hoursAgo),
          text: fixture.decision.text,
        }
      : undefined,
  }));
}
