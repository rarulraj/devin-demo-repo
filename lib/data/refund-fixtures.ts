import type { RefundCategory, RefundRequest, RefundStatus } from "./refund-types";

/**
 * Deterministic fictional refund requests. No real customer or card data.
 *
 * Every amount is in pence and every request carries the context an operator
 * would actually weigh: what the charge was, what the customer claims, and what
 * payments already knows about the account.
 */

type Fixture = {
  id: string;
  customer: string;
  email: string;
  transactionId: string;
  amountMinor: number;
  category: RefundCategory;
  customerReason: string;
  context: string[];
  paymentMethod: string;
  /** Hours before seed time; keeps the queue looking live without random data. */
  chargedHoursAgo: number;
  submittedHoursAgo: number;
  status: RefundStatus;
  requestedBy: string;
  notes?: { author: string; hoursAgo: number; text: string }[];
};

const FIXTURES: Fixture[] = [
  {
    id: "RF-10296",
    customer: "Halden Interiors Ltd",
    email: "accounts@haldeninteriors.example",
    transactionId: "TXN-88421093",
    amountMinor: 489900,
    category: "failed_delivery",
    customerReason: "Order never arrived; courier tracking stopped at the depot 12 days ago.",
    context: [
      "Courier confirmed the consignment as lost on 11 Sept",
      "Merchant has not re-shipped and has no stock",
      "First refund request from this account",
    ],
    paymentMethod: "Visa ···4417",
    chargedHoursAgo: 402,
    submittedHoursAgo: 4,
    status: "pending",
    requestedBy: "Support · Leah Kowalski",
  },
  {
    id: "RF-10295",
    customer: "Dmitri Sokolov",
    email: "d.sokolov@sokolovstudio.example",
    transactionId: "TXN-88419772",
    amountMinor: 315000,
    category: "fraud_claim",
    customerReason: "I did not make this payment. My card was used from another country.",
    context: [
      "Charge geolocated 1,900km from the last 20 transactions",
      "Card reported lost by the issuer two hours after the charge",
      "Issuer chargeback not yet raised",
    ],
    paymentMethod: "Mastercard ···9902",
    chargedHoursAgo: 52,
    submittedHoursAgo: 6,
    status: "pending",
    requestedBy: "Fraud Ops · automated referral",
  },
  {
    id: "RF-10294",
    customer: "Northlight Analytics BV",
    email: "billing@northlight-analytics.example",
    transactionId: "TXN-88418340",
    amountMinor: 240000,
    category: "subscription",
    customerReason: "Annual plan renewed after we cancelled in the dashboard on 2 Sept.",
    context: [
      "Cancellation recorded 2 Sept, renewal charged 4 Sept",
      "No usage on the account since the cancellation",
      "Contract terms allow a 14-day renewal reversal",
    ],
    paymentMethod: "Direct debit · Rabobank",
    chargedHoursAgo: 68,
    submittedHoursAgo: 9,
    status: "pending",
    requestedBy: "Support · Tom Ibarra",
  },
  {
    id: "RF-10293",
    customer: "Aisha Rahman",
    email: "aisha.rahman@rahmancatering.example",
    transactionId: "TXN-88417115",
    amountMinor: 94750,
    category: "service_issue",
    customerReason: "Event was cancelled by the venue and the booking fee was not released.",
    context: [
      "Venue cancellation confirmed in the booking record",
      "Booking fee is refundable under the cancellation policy",
    ],
    paymentMethod: "Visa ···2210",
    chargedHoursAgo: 220,
    submittedHoursAgo: 14,
    status: "pending",
    requestedBy: "Support · Leah Kowalski",
  },
  {
    id: "RF-10292",
    customer: "Vela Fitness Group",
    email: "finance@velafitness.example",
    transactionId: "TXN-88415988",
    amountMinor: 61200,
    category: "duplicate_charge",
    customerReason: "We were billed twice for the same September invoice.",
    context: [
      "TXN-88415987 and TXN-88415988 are identical in amount and timestamp",
      "Gateway shows a retry after a 504 from the merchant",
    ],
    paymentMethod: "Amex ···1008",
    chargedHoursAgo: 96,
    submittedHoursAgo: 20,
    status: "pending",
    requestedBy: "Support · Tom Ibarra",
  },
  {
    id: "RF-10291",
    customer: "Orion Components GmbH",
    email: "ap@orioncomponents.example",
    transactionId: "TXN-88413402",
    amountMinor: 204000,
    category: "failed_delivery",
    customerReason: "Parts never received.",
    context: [
      "Signed proof of delivery supplied by the merchant",
      "Goods signed for at the registered delivery address",
    ],
    paymentMethod: "Visa ···7781",
    chargedHoursAgo: 300,
    submittedHoursAgo: 30,
    status: "rejected",
    requestedBy: "Support · Leah Kowalski",
    notes: [
      {
        author: "Marcus Adeyemi",
        hoursAgo: 9,
        text: "Goods delivered, chargeback evidence supplied.",
      },
    ],
  },
  {
    id: "RF-10290",
    customer: "Beatrice Lindqvist",
    email: "b.lindqvist@lindqvistdesign.example",
    transactionId: "TXN-88412771",
    amountMinor: 38500,
    category: "price_error",
    customerReason: "Charged the list price after the discount code was applied at checkout.",
    context: [
      "Promotion AUTUMN25 was valid at the time of the order",
      "Merchant confirms the pricing bug affected 31 orders",
    ],
    paymentMethod: "Visa ···3391",
    chargedHoursAgo: 40,
    submittedHoursAgo: 22,
    status: "pending",
    requestedBy: "Support · Tom Ibarra",
  },
  {
    id: "RF-10289",
    customer: "Kasper Nielsen",
    email: "kasper.nielsen@nielsenbikes.example",
    transactionId: "TXN-88411204",
    amountMinor: 172500,
    category: "fraud_claim",
    customerReason: "Someone used my account after I lost my phone.",
    context: [
      "Login from a new device 6 minutes before the charge",
      "Three refund claims from this account in the last 90 days",
      "Previous two claims were approved",
    ],
    paymentMethod: "Mastercard ···5540",
    chargedHoursAgo: 74,
    submittedHoursAgo: 26,
    status: "pending",
    requestedBy: "Fraud Ops · automated referral",
  },
  {
    id: "RF-10288",
    customer: "Marisol Ortega",
    email: "marisol.ortega@ortegaflores.example",
    transactionId: "TXN-88410880",
    amountMinor: 15600,
    category: "service_issue",
    customerReason: "Flowers arrived wilted and the merchant will not respond.",
    context: [
      "Photographs supplied with the claim",
      "Merchant has not replied in 6 working days",
    ],
    paymentMethod: "Visa ···6612",
    chargedHoursAgo: 190,
    submittedHoursAgo: 34,
    status: "pending",
    requestedBy: "Support · Leah Kowalski",
  },
  {
    id: "RF-10287",
    customer: "Fenwick & Broad LLP",
    email: "accounts@fenwickbroad.example",
    transactionId: "TXN-88409431",
    amountMinor: 41290,
    category: "duplicate_charge",
    customerReason: "Double payment on the same retainer invoice.",
    context: [
      "Two settlements against invoice INV-4417",
      "Second settlement made from a different card on the same account",
    ],
    paymentMethod: "Visa ···0044",
    chargedHoursAgo: 120,
    submittedHoursAgo: 38,
    status: "pending",
    requestedBy: "Support · Tom Ibarra",
  },
  {
    id: "RF-10286",
    customer: "Tobias Adeyemi-Clarke",
    email: "t.adeyemiclarke@clarkeaudio.example",
    transactionId: "TXN-88408217",
    amountMinor: 8990,
    category: "subscription",
    customerReason: "Monthly plan charged after I downgraded to the free tier.",
    context: [
      "Downgrade recorded one day after the billing date",
      "Pro features used for 3 days in the billed period",
    ],
    paymentMethod: "Apple Pay · Visa ···8834",
    chargedHoursAgo: 150,
    submittedHoursAgo: 44,
    status: "pending",
    requestedBy: "Support · Leah Kowalski",
  },
  {
    id: "RF-10285",
    customer: "Greenmoor Allotment Society",
    email: "treasurer@greenmoor.example",
    transactionId: "TXN-88406902",
    amountMinor: 7200,
    category: "price_error",
    customerReason: "Charged for 12 months instead of the 6-month membership we selected.",
    context: ["Order record shows a 6-month term", "Merchant agrees the charge was wrong"],
    paymentMethod: "Direct debit · Barclays",
    chargedHoursAgo: 210,
    submittedHoursAgo: 50,
    status: "pending",
    requestedBy: "Support · Tom Ibarra",
  },
  {
    id: "RF-10284",
    customer: "Priyanka Nair",
    email: "priyanka.nair@nairconsulting.example",
    transactionId: "TXN-88405118",
    amountMinor: 12840,
    category: "duplicate_charge",
    customerReason: "Paid the same invoice twice by mistake.",
    context: ["Duplicate confirmed by payments reconciliation"],
    paymentMethod: "Visa ···1123",
    chargedHoursAgo: 260,
    submittedHoursAgo: 58,
    status: "approved",
    requestedBy: "Support · Leah Kowalski",
    notes: [
      {
        author: "Marcus Adeyemi",
        hoursAgo: 9,
        text: "Duplicate charge confirmed by payments.",
      },
    ],
  },
  {
    id: "RF-10283",
    customer: "Bright Harbour Nursery",
    email: "admin@brightharbour.example",
    transactionId: "TXN-88403774",
    amountMinor: 54000,
    category: "service_issue",
    customerReason: "Sessions were not delivered during the August closure.",
    context: ["Closure confirmed by the merchant", "Pro-rata credit already offered and declined"],
    paymentMethod: "Visa ···9017",
    chargedHoursAgo: 520,
    submittedHoursAgo: 70,
    status: "approved",
    requestedBy: "Support · Tom Ibarra",
    notes: [
      {
        author: "Dana Whitfield",
        hoursAgo: 62,
        text: "Merchant confirmed the closure; refunding in full.",
      },
    ],
  },
  {
    id: "RF-10282",
    customer: "Lucas Moreau",
    email: "lucas.moreau@moreaucycles.example",
    transactionId: "TXN-88402310",
    amountMinor: 26500,
    category: "fraud_claim",
    customerReason: "Unrecognised charge on my statement.",
    context: [
      "Charge matches the customer's usual merchant and device",
      "Customer later confirmed a family member made the purchase",
    ],
    paymentMethod: "Visa ···4402",
    chargedHoursAgo: 600,
    submittedHoursAgo: 82,
    status: "rejected",
    requestedBy: "Fraud Ops · automated referral",
    notes: [
      {
        author: "Dana Whitfield",
        hoursAgo: 76,
        text: "Customer withdrew the claim; charge is legitimate.",
      },
    ],
  },
];

export function buildRefunds(seededAt: Date): RefundRequest[] {
  const base = seededAt.getTime();
  const hoursBefore = (hours: number) => new Date(base - hours * 3_600_000).toISOString();

  return FIXTURES.map((fixture) => ({
    id: fixture.id,
    customer: fixture.customer,
    email: fixture.email,
    transactionId: fixture.transactionId,
    amountMinor: fixture.amountMinor,
    currency: "GBP" as const,
    category: fixture.category,
    customerReason: fixture.customerReason,
    context: fixture.context,
    paymentMethod: fixture.paymentMethod,
    chargedAt: hoursBefore(fixture.chargedHoursAgo),
    submittedAt: hoursBefore(fixture.submittedHoursAgo),
    status: fixture.status,
    requestedBy: fixture.requestedBy,
    notes: (fixture.notes ?? []).map((note) => ({
      author: note.author,
      at: hoursBefore(note.hoursAgo),
      text: note.text,
    })),
  }));
}
