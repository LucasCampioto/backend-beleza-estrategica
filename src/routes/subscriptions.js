import { Router } from 'express';
import { isStripeConfigured } from '../services/stripeClient.js';
import { listPlans } from '../services/subscriptionPlans.js';
import { createSubscriptionCheckoutSession } from '../services/checkoutSessions.js';
import { findUserByEmail, findUserById } from '../services/users.js';
import {
  createBillingPortalSessionForUser,
  getCurrentSubscriptionSummary,
} from '../services/subscriptionManagement.js';

function loginUrlDefault() {
  const explicit = process.env.FRONTEND_LOGIN_URL?.trim();
  if (explicit) return explicit;
  const origin = process.env.CORS_ORIGIN?.trim() || 'http://localhost:8080';
  return `${origin.replace(/\/$/, '')}/login`;
}

export function createSubscriptionsRouter(requireAuth) {
  const r = Router();

  r.get('/plans', async (_req, res) => {
    try {
      if (!isStripeConfigured()) {
        res.status(503).json({ message: 'Pagamentos não configurados (STRIPE_SECRET_KEY)' });
        return;
      }
      const plans = await listPlans();
      res.json(plans);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Erro ao listar planos' });
    }
  });

  r.post('/checkout', async (req, res) => {
    try {
      if (!isStripeConfigured()) {
        res.status(503).json({ message: 'Pagamentos não configurados (STRIPE_SECRET_KEY)' });
        return;
      }
      const { email, name, clinic, priceId, trialPeriodDays, checkoutUi } = req.body || {};
      if (!email || !name || !priceId) {
        res.status(400).json({ message: 'email, name e priceId são obrigatórios' });
        return;
      }
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({
          message:
            'Já existe uma conta com este e-mail. Faça login para gerenciar ou ativar sua assinatura.',
          loginUrl: loginUrlDefault(),
        });
        return;
      }

      const ui = checkoutUi === 'embedded' ? 'embedded' : 'hosted';
      const envTrial = Number(process.env.TRIAL_PERIOD_DAYS);
      const bodyTrial = Number(trialPeriodDays);
      const effectiveTrialPeriodDays = Number.isFinite(bodyTrial)
        ? bodyTrial
        : Number.isFinite(envTrial)
          ? envTrial
          : undefined;

      const result = await createSubscriptionCheckoutSession({
        email,
        name,
        clinic,
        priceId,
        trialPeriodDays: effectiveTrialPeriodDays,
        checkoutUi: ui,
      });

      if (ui === 'embedded') {
        if (!result.clientSecret) {
          res.status(500).json({ message: 'Sessão embedded sem client_secret' });
          return;
        }
        res.status(201).json({ clientSecret: result.clientSecret, sessionId: result.sessionId });
        return;
      }

      if (!result.url) {
        res.status(500).json({ message: 'Sessão de checkout sem URL' });
        return;
      }
      res.status(201).json({ url: result.url, sessionId: result.sessionId });
    } catch (e) {
      console.error(e);
      const msg = e.message || 'Erro ao criar checkout';
      if (msg.includes('inválido') || msg.includes('indisponível')) {
        res.status(400).json({ message: msg });
        return;
      }
      if (msg.includes('STRIPE_SUCCESS_URL') || msg.includes('STRIPE_CANCEL_URL')) {
        res.status(503).json({ message: msg });
        return;
      }
      if (msg.includes('STRIPE_RETURN_URL')) {
        res.status(503).json({ message: msg });
        return;
      }
      res.status(500).json({ message: 'Erro ao criar sessão de pagamento' });
    }
  });

  r.get('/checkout-session/status', async (req, res) => {
    try {
      if (!isStripeConfigured()) {
        res.status(503).json({ subscription: false });
        return;
      }
      const sessionId = String(req.query.session_id || '').trim();
      if (!sessionId.startsWith('cs_') || sessionId.length < 10) {
        res.status(200).json({ subscription: false });
        return;
      }
      const stripe = (await import('../services/stripeClient.js')).getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const active =
        session.mode === 'subscription' &&
        session.status === 'complete' &&
        (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');
      res.json({ subscription: active });
    } catch (e) {
      console.error('[checkout-session/status]', e?.message ?? e);
      res.json({ subscription: false });
    }
  });

  r.get('/current', requireAuth, async (req, res) => {
    try {
      if (!isStripeConfigured()) {
        res.status(503).json({ message: 'Pagamentos não configurados (STRIPE_SECRET_KEY)' });
        return;
      }
      const user = await findUserById(req.userId);
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }

      const current = await getCurrentSubscriptionSummary(user);
      res.json(current);
    } catch (e) {
      console.error(e);
      const msg = e.message || '';
      if (msg.includes('No such subscription')) {
        res.status(404).json({ message: 'Assinatura não encontrada no Stripe' });
        return;
      }
      res.status(500).json({ message: 'Erro ao carregar assinatura atual' });
    }
  });

  r.post('/portal', requireAuth, async (req, res) => {
    try {
      if (!isStripeConfigured()) {
        res.status(503).json({ message: 'Pagamentos não configurados (STRIPE_SECRET_KEY)' });
        return;
      }
      const user = await findUserById(req.userId);
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }

      const portal = await createBillingPortalSessionForUser(user);
      res.status(201).json(portal);
    } catch (e) {
      console.error(e);
      const msg = e.message || 'Erro ao abrir portal de assinatura';
      if (msg.includes('sem cliente Stripe')) {
        res.status(400).json({ message: msg });
        return;
      }
      if (msg.includes('STRIPE_BILLING_PORTAL_RETURN_URL')) {
        res.status(503).json({ message: msg });
        return;
      }
      res.status(500).json({ message: 'Erro ao abrir portal de assinatura' });
    }
  });

  return r;
}
