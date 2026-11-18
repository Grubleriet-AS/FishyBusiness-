// shop-checkout verify (tilbakemelding #185, 18.11.2026): what a Checkout session read from Stripe lets the server do
// (supabase/functions/_shared/kjop.mjs sessionVerdict). Booked only when paid and nothing taken back; never a session refunded in part or in
// whole, or disputed, so a purchase refunded while the webhook was missing never gives the ware after the money is back; not when the
// charge cannot be read; and a payment that confirms later (unpaid at the end of Checkout) is left to the webhook.
import { sessionVerdict } from '../../supabase/functions/_shared/kjop.mjs';

export default function (t){
  const pi = ch => ({id:'pi_1', latest_charge:ch});
  const ok = {refunded:false, amount_refunded:0, disputed:false};
  t.eq(sessionVerdict({status:'complete', payment_status:'paid', payment_intent:pi(ok)}), 'book', 'betalt og ingenting tatt tilbake: bokføres');
  t.eq(sessionVerdict({status:'complete', payment_status:'paid', payment_intent:pi(Object.assign({}, ok, {refunded:true, amount_refunded:1900}))}), 'refunded', 'refundert i sin helhet: aldri bokført');
  t.eq(sessionVerdict({status:'complete', payment_status:'paid', payment_intent:pi(Object.assign({}, ok, {amount_refunded:500}))}), 'refunded', 'refundert delvis: aldri bokført');
  t.eq(sessionVerdict({status:'complete', payment_status:'paid', payment_intent:pi(Object.assign({}, ok, {disputed:true}))}), 'refunded', 'bestridt: aldri bokført');
  t.eq(sessionVerdict({status:'complete', payment_status:'paid', payment_intent:'pi_1'}), 'open', 'betalingen ikke utvidet (ingen belastning å lese): ikke bokført');
  t.eq(sessionVerdict({status:'complete', payment_status:'paid', payment_intent:pi('ch_1')}), 'open', 'belastningen ikke utvidet: ikke bokført');
  t.eq(sessionVerdict({status:'complete', payment_status:'paid', payment_intent:null}), 'open', 'betalt uten betaling å lese: ikke bokført');
  t.eq(sessionVerdict({status:'complete', payment_status:'unpaid', payment_intent:pi(ok)}), 'open', 'betaling som bekreftes senere: webhooken bokfører');
  t.eq(sessionVerdict({status:'open', payment_status:'unpaid'}), 'open', 'ikke betalt ennå');
  t.eq(sessionVerdict({status:'expired', payment_status:'unpaid'}), 'expired', 'utløpt');
  t.eq(sessionVerdict({status:'complete', payment_status:'no_payment_required', payment_intent:null}), 'book', 'gratis (ingen betaling trengs): bokføres');
  t.eq(sessionVerdict(null), 'open', 'ingen økt: ikke bokført');
}
