import { Router } from 'express';
import { listSimulations, createSimulation } from '../services/simulations.js';

export function createSimulationsRouter(requireAuth) {
  const r = Router();
  r.use(requireAuth);

  r.get('/simulations', async (req, res) => {
    try {
      const { patientId, procedure, from, to } = req.query;
      const list = await listSimulations(req.userId, { patientId, procedure, from, to });
      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Erro ao listar simulações' });
    }
  });

  r.post('/simulations', async (req, res) => {
    try {
      const result = await createSimulation(req.userId, req.body || {});
      if (result.error) {
        res.status(result.status || 400).json({ message: result.error });
        return;
      }
      res.status(201).json(result.simulation);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Erro ao criar simulação' });
    }
  });

  return r;
}
