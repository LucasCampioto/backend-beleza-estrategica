import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDb } from './adapters/db.js';
import { createRequireAuth } from './middleware/auth.js';
import { createAuthRouter, createMeRouter } from './routes/auth.js';
import { createProceduresRouter } from './routes/procedures.js';
import { createPatientsRouter } from './routes/patients.js';
import { createSimulationsRouter } from './routes/simulations.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { seedProceduresIfEmpty } from './services/procedures.js';

const PORT = Number(process.env.PORT) || 3001;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080';

if (!MONGODB_URI || !JWT_SECRET) {
  console.error('Defina MONGODB_URI e JWT_SECRET no .env');
  process.exit(1);
}

await connectDb(MONGODB_URI);
await seedProceduresIfEmpty();

const app = express();
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));

const requireAuth = createRequireAuth(JWT_SECRET);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', createAuthRouter(JWT_SECRET));
app.use('/api', createMeRouter(JWT_SECRET, requireAuth));
app.use('/api', createProceduresRouter(requireAuth));
app.use('/api', createPatientsRouter(requireAuth));
app.use('/api', createSimulationsRouter(requireAuth));
app.use('/api', createDashboardRouter(requireAuth));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Erro interno' });
});

app.listen(PORT, () => {
  console.log(`API em http://localhost:${PORT}`);
});
