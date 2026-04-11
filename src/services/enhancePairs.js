import { EnhancePair } from '../models/enhancePair.js';
import { resolveReadUrl } from './r2Storage.js';

export async function createEnhancePairDoc({
  pairId,
  userId,
  originalKey,
  afterKey,
  originalContentType,
  afterContentType,
}) {
  await EnhancePair.create({
    pairId,
    userId,
    originalKey,
    afterKey,
    originalContentType,
    afterContentType,
  });
}

export async function getPairUrlsForUser(pairId, userId) {
  const doc = await EnhancePair.findOne({ pairId, userId }).lean();
  if (!doc) return null;
  const originalUrl = await resolveReadUrl(doc.originalKey);
  const afterUrl = await resolveReadUrl(doc.afterKey);
  return { originalUrl, afterUrl, originalKey: doc.originalKey, afterKey: doc.afterKey };
}
