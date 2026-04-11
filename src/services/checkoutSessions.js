import { getStripe } from './stripeClient.js';
import { isAllowedPriceId } from './subscriptionPlans.js';

export async function createSubscriptionCheckoutSession({ email, name, clinic, priceId, trialPeriodDays }) {
  const successUrl = process.env.STRIPE_SUCCESS_URL;
  const cancelUrl = process.env.STRIPE_CANCEL_URL;
  if (!successUrl || !cancelUrl) {
    throw new Error('STRIPE_SUCCESS_URL e STRIPE_CANCEL_URL são obrigatórios no .env');
  }

  const allowed = await isAllowedPriceId(priceId);
  if (!allowed) {
    throw new Error('Plano inválido ou indisponível');
  }

  const stripe = getStripe();
  const metadata = {
    app_user_name: String(name || '').trim() || 'Usuário',
    app_user_clinic: String(clinic || '').trim(),
  };

  const subscriptionData = {
    metadata: { ...metadata },
  };
  const trial = trialPeriodDays != null ? Number(trialPeriodDays) : NaN;
  if (Number.isFinite(trial) && trial > 0) {
    subscriptionData.trial_period_days = Math.min(Math.floor(trial), 730);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: String(email).toLowerCase().trim(),
    line_items: [{ price: String(priceId).trim(), quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: subscriptionData,
  });

  return { url: session.url, sessionId: session.id };
}
