import axios from 'axios';
import FormData from 'form-data';

/**
 * Encaminha o mesmo multipart ao agente.
 * @param {string} agentBaseUrl
 * @param {{ buffer: Buffer, filename: string, mime: string, tipos: string[], regioes: string, intensidade: string }} parts
 */
export async function forwardEnhanceToAgent(agentBaseUrl, parts) {
  const base = String(agentBaseUrl || '').replace(/\/$/, '');
  const fd = new FormData();
  fd.append('image', parts.buffer, {
    filename: parts.filename || 'upload.jpg',
    contentType: parts.mime || 'image/jpeg',
  });
  for (const t of parts.tipos) {
    if (t) fd.append('tipo_procedimento', t);
  }
  fd.append('regioes', parts.regioes || '');
  fd.append('intensidade', parts.intensidade || 'moderado');

  const url = `${base}/v1/enhance?format=json`;
  const response = await axios.post(url, fd, {
    headers: fd.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });
  return { data: response.data, status: response.status };
}
