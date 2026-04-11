import { Router } from 'express';
import { isStripeConfigured } from '../services/stripeClient.js';
import { listPlans } from '../services/subscriptionPlans.js';
import { createSubscriptionCheckoutSession } from '../services/checkoutSessions.js';

export function createSubscriptionsRouter() {
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
      const { email, name, clinic, priceId, trialPeriodDays } = req.body || {};
      if (!email || !name || !priceId) {
        res.status(400).json({ message: 'email, name e priceId são obrigatórios' });
        return;
      }
      const { url, sessionId } = await createSubscriptionCheckoutSession({
        email,
        name,
        clinic,
        priceId,
        trialPeriodDays,
      });
      if (!url) {
        res.status(500).json({ message: 'Sessão de checkout sem URL' });
        return;
      }
      res.status(201).json({ url, sessionId });
    } catch (e) {
      console.error(e);
      const msg = e.message || 'Erro ao criar checkout';
      if (msg.includes('inválido') || msg.includes('indisponível')) {
        res.status(400).json({ message: msg });
        return;
      }
      if (msg.includes('STRIPE_SUCCESS_URL')) {
        res.status(503).json({ message: msg });
        return;
      }
      res.status(500).json({ message: 'Erro ao criar sessão de pagamento' });
    }
  });

  return r;
}
