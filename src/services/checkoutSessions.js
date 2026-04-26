import { getStripe } from './stripeClient.js';
import { isAllowedPriceId } from './subscriptionPlans.js';

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

async function resolveStripeCustomerId(stripe, email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const customers = await stripe.customers.list({ email: normalizedEmail, limit: 10 });
  if (!customers?.data?.length) return null;

  const activeCustomer = customers.data.find((customer) => !customer.deleted);
  return activeCustomer ? String(activeCustomer.id) : null;
}

/**
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.name
 * @param {string} [params.clinic]
 * @param {string} params.priceId
 * @param {number} [params.trialPeriodDays]
 * @param {'hosted'|'embedded'} [params.checkoutUi]
 */
export async function createSubscriptionCheckoutSession({
  email,
  name,
  clinic,
  priceId,
  trialPeriodDays,
  checkoutUi = 'hosted',
}) {
  const allowed = await isAllowedPriceId(priceId);
  if (!allowed) {
    throw new Error('Plano inválido ou indisponível');
  }

  const stripe = getStripe();
  const normalizedEmail = normalizeEmail(email);
  const customerId = await resolveStripeCustomerId(stripe, normalizedEmail);
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

  const baseParams = {
    mode: 'subscription',
    line_items: [{ price: String(priceId).trim(), quantity: 1 }],
    metadata,
    subscription_data: subscriptionData,
  };
  if (customerId) {
    baseParams.customer = customerId;
  } else {
    baseParams.customer_email = normalizedEmail;
  }

  if (checkoutUi === 'embedded') {
    const returnUrl = process.env.STRIPE_RETURN_URL;
    if (!returnUrl || !returnUrl.includes('{CHECKOUT_SESSION_ID}')) {
      throw new Error(
        'STRIPE_RETURN_URL é obrigatório no .env para checkout embedded (inclua {CHECKOUT_SESSION_ID})',
      );
    }
    const session = await stripe.checkout.sessions.create({
      ...baseParams,
      ui_mode: 'embedded',
      return_url: returnUrl,
    });
    const clientSecret = session.client_secret;
    if (!clientSecret) {
      throw new Error('Sessão embedded sem client_secret');
    }
    return { clientSecret, sessionId: session.id };
  }

  const successUrl = process.env.STRIPE_SUCCESS_URL;
  const cancelUrl = process.env.STRIPE_CANCEL_URL;
  if (!successUrl || !cancelUrl) {
    throw new Error('STRIPE_SUCCESS_URL e STRIPE_CANCEL_URL são obrigatórios no .env');
  }

  const session = await stripe.checkout.sessions.create({
    ...baseParams,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { url: session.url, sessionId: session.id };
}
