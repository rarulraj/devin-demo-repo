import type { CheckState, KycCase, KycStatus } from "./kyc-types";

/**
 * Deterministic fictional onboarding cases. No real customer data.
 *
 * Risk scores are not decorative: every case above the medium threshold carries
 * factors and failed checks that explain the score, so a reviewer can always see
 * why the queue is asking for their attention.
 */

type FixtureCheck = [state: CheckState, detail: string];

type Fixture = {
  id: string;
  customer: string;
  email: string;
  country: string;
  /** Hours before seed time; keeps the queue looking live without random data. */
  submittedHoursAgo: number;
  riskScore: number;
  status: KycStatus;
  assignee: string;
  identity: FixtureCheck;
  sanctions: FixtureCheck;
  address: FixtureCheck;
  document: FixtureCheck;
  riskFactors: string[];
  notes?: { author: string; hoursAgo: number; text: string }[];
};

const FIXTURES: Fixture[] = [
  {
    id: "KYC-4836",
    customer: "Meridian Crypto Exchange Ltd",
    email: "compliance@meridian-exchange.example",
    country: "Seychelles",
    submittedHoursAgo: 3,
    riskScore: 91,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "Director passport verified against chip data"],
    sanctions: ["failed", "Beneficial owner matches OFAC SDN entry (92% name, DOB match)"],
    address: ["needs_review", "Registered office is a company formation agent address"],
    document: ["needs_review", "Certificate of incorporation is a scan of a scan"],
    riskFactors: [
      "High-risk jurisdiction (Seychelles)",
      "Money services business",
      "Sanctions screening hit on beneficial owner",
      "Ownership chain includes two nominee shareholders",
    ],
  },
  {
    id: "KYC-4835",
    customer: "Nadia Okonkwo",
    email: "n.okonkwo@brightpath.example",
    country: "Nigeria",
    submittedHoursAgo: 5,
    riskScore: 78,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["needs_review", "Selfie liveness score 0.62, below the 0.80 threshold"],
    sanctions: ["passed", "No watchlist or PEP match"],
    address: ["failed", "Utility bill address does not match the application address"],
    document: ["passed", "National ID validated against issuer registry"],
    riskFactors: [
      "Address mismatch between application and supporting document",
      "Two prior applications from the same device fingerprint",
      "Expected monthly volume 8x the segment median",
    ],
    notes: [
      {
        author: "Marcus Adeyemi",
        hoursAgo: 2,
        text: "Requested a second proof of address; customer has 5 working days to respond.",
      },
    ],
  },
  {
    id: "KYC-4834",
    customer: "Grigor Petrov",
    email: "g.petrov@petrovholdings.example",
    country: "Bulgaria",
    submittedHoursAgo: 7,
    riskScore: 84,
    status: "escalated",
    assignee: "Dana Whitfield",
    identity: ["passed", "Passport verified, MRZ consistent"],
    sanctions: ["needs_review", "Possible PEP: deputy minister of transport 2014–2018"],
    address: ["passed", "Bank statement matches application address"],
    document: ["passed", "Source of funds letter provided by counsel"],
    riskFactors: [
      "Politically exposed person (former)",
      "Source of wealth concentrated in state infrastructure contracts",
      "Requires enhanced due diligence sign-off",
    ],
    notes: [
      {
        author: "Marcus Adeyemi",
        hoursAgo: 6,
        text: "PEP status probable. Escalating for EDD sign-off rather than deciding at reviewer level.",
      },
    ],
  },
  {
    id: "KYC-4833",
    customer: "Kestrel Renewables SL",
    email: "finance@kestrel-renewables.example",
    country: "Spain",
    submittedHoursAgo: 9,
    riskScore: 31,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "Two directors verified"],
    sanctions: ["passed", "No watchlist match"],
    address: ["passed", "Commercial registry address confirmed"],
    document: ["needs_review", "Latest filed accounts are 14 months old"],
    riskFactors: ["Accounts older than 12 months"],
  },
  {
    id: "KYC-4832",
    customer: "Yusuf Demir",
    email: "yusuf.demir@demirtextiles.example",
    country: "Türkiye",
    submittedHoursAgo: 11,
    riskScore: 66,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "ID card verified"],
    sanctions: ["passed", "No watchlist match"],
    address: ["needs_review", "Address is a shared industrial unit with 6 registered businesses"],
    document: ["failed", "Uploaded invoice shows signs of digital editing (font mismatch)"],
    riskFactors: [
      "Document tampering indicators on proof of trading",
      "Cash-intensive sector",
      "Cross-border payments to three high-risk jurisdictions declared",
    ],
  },
  {
    id: "KYC-4831",
    customer: "Claire Beaumont",
    email: "claire.beaumont@beaumontdesign.example",
    country: "France",
    submittedHoursAgo: 13,
    riskScore: 12,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "Passport verified, liveness 0.96"],
    sanctions: ["passed", "No watchlist match"],
    address: ["passed", "Bank statement matches"],
    document: ["passed", "Sole trader registration confirmed"],
    riskFactors: [],
  },
  {
    id: "KYC-4830",
    customer: "Helix Trading BV",
    email: "ops@helixtrading.example",
    country: "Netherlands",
    submittedHoursAgo: 16,
    riskScore: 74,
    status: "escalated",
    assignee: "Dana Whitfield",
    identity: ["passed", "Director verified"],
    sanctions: ["needs_review", "Adverse media: 2023 commodities fraud investigation, not charged"],
    address: ["passed", "Chamber of commerce address confirmed"],
    document: ["passed", "Articles of association provided"],
    riskFactors: [
      "Adverse media hit on the managing director",
      "Trade finance exposure to sanctioned corridors",
    ],
    notes: [
      {
        author: "Marcus Adeyemi",
        hoursAgo: 15,
        text: "Adverse media hit requires enhanced due diligence.",
      },
    ],
  },
  {
    id: "KYC-4829",
    customer: "Priya Venkatesan",
    email: "priya.v@saffronanalytics.example",
    country: "India",
    submittedHoursAgo: 19,
    riskScore: 27,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "Aadhaar-linked verification passed"],
    sanctions: ["passed", "No watchlist match"],
    address: ["needs_review", "Recently moved; new address 3 weeks old"],
    document: ["passed", "GST registration confirmed"],
    riskFactors: ["Address history shorter than 3 months"],
  },
  {
    id: "KYC-4828",
    customer: "Northwind Payments Oy",
    email: "kyc@northwindpay.example",
    country: "Finland",
    submittedHoursAgo: 22,
    riskScore: 58,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "Board members verified"],
    sanctions: ["passed", "No watchlist match"],
    address: ["passed", "Registry address confirmed"],
    document: ["needs_review", "Payment institution licence pending renewal"],
    riskFactors: [
      "Regulated payment institution — licence renewal in progress",
      "Onward payment flows to non-EEA corridors",
    ],
  },
  {
    id: "KYC-4827",
    customer: "Tomás Ferreira",
    email: "t.ferreira@ferreiraimports.example",
    country: "Portugal",
    submittedHoursAgo: 26,
    riskScore: 19,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "Citizen card verified"],
    sanctions: ["passed", "No watchlist match"],
    address: ["passed", "Utility bill matches"],
    document: ["passed", "Import licence verified"],
    riskFactors: [],
  },
  {
    id: "KYC-4826",
    customer: "Zephyr Gaming FZ-LLC",
    email: "legal@zephyrgaming.example",
    country: "United Arab Emirates",
    submittedHoursAgo: 30,
    riskScore: 81,
    status: "escalated",
    assignee: "Dana Whitfield",
    identity: ["passed", "Two shareholders verified"],
    sanctions: ["passed", "No watchlist match"],
    address: ["passed", "Free zone address confirmed"],
    document: ["failed", "Gaming licence covers a different legal entity"],
    riskFactors: [
      "Online gambling sector",
      "Licence held by a related but distinct entity",
      "Free zone structure obscures ultimate ownership",
    ],
    notes: [
      {
        author: "Marcus Adeyemi",
        hoursAgo: 28,
        text: "Licence mismatch is material. Escalated for legal review of the group structure.",
      },
    ],
  },
  {
    id: "KYC-4825",
    customer: "Ingrid Larsen",
    email: "ingrid.larsen@nordfjord.example",
    country: "Norway",
    submittedHoursAgo: 34,
    riskScore: 9,
    status: "approved",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "BankID verified"],
    sanctions: ["passed", "No watchlist match"],
    address: ["passed", "Population registry match"],
    document: ["passed", "Business registration confirmed"],
    riskFactors: [],
    notes: [
      {
        author: "Marcus Adeyemi",
        hoursAgo: 32,
        text: "All checks clean, low-risk domestic sole trader.",
      },
    ],
  },
  {
    id: "KYC-4824",
    customer: "Cobalt Metals Trading DMCC",
    email: "compliance@cobaltmetals.example",
    country: "United Arab Emirates",
    submittedHoursAgo: 38,
    riskScore: 69,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "Directors verified"],
    sanctions: ["needs_review", "Counterparty in supply chain appears on an EU entity list"],
    address: ["passed", "DMCC address confirmed"],
    document: ["passed", "Trade licence verified"],
    riskFactors: [
      "Precious metals trading",
      "Counterparty concentration in a restricted-entity supply chain",
    ],
  },
  {
    id: "KYC-4823",
    customer: "Sofia Almeida",
    email: "sofia.almeida@almeidaconsult.example",
    country: "Brazil",
    submittedHoursAgo: 43,
    riskScore: 44,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["needs_review", "Document photo quality below threshold, resubmission requested"],
    sanctions: ["passed", "No watchlist match"],
    address: ["passed", "Bank statement matches"],
    document: ["passed", "CNPJ registration confirmed"],
    riskFactors: ["Identity document requires resubmission"],
  },
  {
    id: "KYC-4822",
    customer: "Bramble & Co Accountants LLP",
    email: "partners@brambleco.example",
    country: "United Kingdom",
    submittedHoursAgo: 47,
    riskScore: 24,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "Both partners verified"],
    sanctions: ["passed", "No watchlist match"],
    address: ["passed", "Companies House address confirmed"],
    document: ["needs_review", "Professional indemnity certificate expires in 11 days"],
    riskFactors: ["Trust and company service provider activity declared"],
  },
  {
    id: "KYC-4821",
    customer: "Aurora Logistics Ltd",
    email: "finance@auroralogistics.example",
    country: "United Kingdom",
    submittedHoursAgo: 52,
    riskScore: 22,
    status: "approved",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "Director verified"],
    sanctions: ["passed", "No watchlist match"],
    address: ["passed", "Registry address confirmed"],
    document: ["passed", "Filed accounts current"],
    riskFactors: [],
    notes: [
      {
        author: "Marcus Adeyemi",
        hoursAgo: 50,
        text: "Documents matched registry record.",
      },
    ],
  },
  {
    id: "KYC-4820",
    customer: "Mateo Rossi",
    email: "mateo.rossi@rossiartigiani.example",
    country: "Italy",
    submittedHoursAgo: 58,
    riskScore: 35,
    status: "pending",
    assignee: "Marcus Adeyemi",
    identity: ["passed", "ID verified"],
    sanctions: ["passed", "No watchlist match"],
    address: ["needs_review", "Residence certificate issued by a different comune"],
    document: ["passed", "VAT registration confirmed"],
    riskFactors: ["Address documentation inconsistent across sources"],
  },
  {
    id: "KYC-4802",
    customer: "Vantage Freight GmbH",
    email: "buchhaltung@vantagefreight.example",
    country: "Germany",
    submittedHoursAgo: 63,
    riskScore: 88,
    status: "rejected",
    assignee: "Dana Whitfield",
    identity: ["passed", "Managing director verified"],
    sanctions: ["failed", "Confirmed match: shareholder listed under EU restrictive measures"],
    address: ["passed", "Handelsregister address confirmed"],
    document: ["passed", "Shareholder register provided"],
    riskFactors: [
      "Confirmed sanctions match on a 30% shareholder",
      "Freight routes through restricted corridors",
    ],
    notes: [
      {
        author: "Dana Whitfield",
        hoursAgo: 60,
        text: "Sanctions screening match confirmed.",
      },
    ],
  },
];

const CHECK_LABELS = {
  identity: "Identity Verification",
  sanctions: "Sanctions Screening",
  address: "Address Verification",
  document: "Document Verification",
} as const;

export function buildKycCases(seededAt: Date): KycCase[] {
  const at = (hoursAgo: number) =>
    new Date(seededAt.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();

  return FIXTURES.map((fixture) => ({
    id: fixture.id,
    customer: fixture.customer,
    email: fixture.email,
    country: fixture.country,
    submittedAt: at(fixture.submittedHoursAgo),
    riskScore: fixture.riskScore,
    status: fixture.status,
    assignee: fixture.assignee,
    checks: (["identity", "sanctions", "address", "document"] as const).map((key) => ({
      key,
      label: CHECK_LABELS[key],
      state: fixture[key][0],
      detail: fixture[key][1],
    })),
    riskFactors: fixture.riskFactors,
    notes: (fixture.notes ?? []).map((note) => ({
      author: note.author,
      at: at(note.hoursAgo),
      text: note.text,
    })),
  }));
}
