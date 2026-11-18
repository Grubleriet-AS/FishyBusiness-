// What shop-checkout's verify does with a Checkout session read from Stripe (tilbakemelding #185, 18.11.2026), as a pure function so it
// can be tested without Stripe (tests/unit/kjop.test.mjs). The session is read with payment_intent.latest_charge expanded.
//   'book'      paid, and nothing of it taken back: shop_paid may book it
//   'open'      not paid yet (or paid by a way that confirms later: the webhook's async_payment_succeeded books it), or the charge could
//               not be read, so whether it was refunded is not known: nothing is booked, the webhook stays the way
//   'expired'   the session ran out unpaid
//   'refunded'  paid, but refunded in part or in whole, or disputed: never booked here, so a purchase refunded while the webhook was
//               missing does not give the ware after the money is back
export type SessionLike = {status?: string | null, payment_status?: string | null, payment_intent?: unknown};
type ChargeLike = {refunded?: boolean, amount_refunded?: number, disputed?: boolean};

export function sessionVerdict(s: SessionLike): 'book' | 'open' | 'expired' | 'refunded' {
  if (!s || typeof s !== 'object') return 'open';
  if (s.status === 'expired') return 'expired';
  if (s.payment_status === 'no_payment_required') return 'book';
  if (s.payment_status !== 'paid') return 'open';
  const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent as {latest_charge?: unknown} : null;
  const ch = pi && pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge as ChargeLike : null;
  if (!ch) return 'open';
  if (ch.refunded || (Number(ch.amount_refunded) || 0) > 0 || ch.disputed) return 'refunded';
  return 'book';
}
