import { Router } from 'express';
import { getPairUrlsForUser } from '../services/enhancePairs.js';

export function createEnhancePairsRouter(requireAuth) {
  const r = Router();
  r.use(requireAuth);

  r.get('/enhance-pairs/:pairId', async (req, res) => {
    const pairId = String(req.params.pairId || '').trim();
    if (!pairId) {
      res.status(400).json({ message: 'pairId inválido' });
      return;
    }
    try {
      console.log('[R2] GET enhance-pairs', { pairId, userId: req.userId });
      const urls = await getPairUrlsForUser(pairId, req.userId);
      if (!urls) {
        console.log('[R2] GET enhance-pairs: par não encontrado no Mongo', { pairId });
        res.status(404).json({ message: 'Par não encontrado' });
        return;
      }
      console.log('[R2] GET enhance-pairs: ok', { pairId });
      res.json({
        originalUrl: urls.originalUrl,
        afterUrl: urls.afterUrl,
      });
    } catch (e) {
      console.error('[R2] GET enhance-pairs erro (ex.: R2 ao gerar URL)', {
        pairId,
        message: e?.message,
        name: e?.name,
        code: e?.Code ?? e?.code,
        httpStatusCode: e?.$metadata?.httpStatusCode,
        requestId: e?.$metadata?.requestId,
      });
      res.status(502).json({ message: 'Falha ao gerar URLs das imagens' });
    }
  });

  return r;
}
