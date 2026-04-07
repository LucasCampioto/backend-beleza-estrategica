# Backend Beleza Estratégica

API Node.js (Express + Mongoose) na porta **3001**. Não inclui a rota `/v1/enhance` (agente separado).

## Requisitos

- Node 18+
- MongoDB em execução local (ou ajuste `MONGODB_URI`)

## Configuração

1. Copie `.env.example` para `.env` se necessário.
2. `npm install`
3. `npm run dev`

Variáveis:

- `PORT` — padrão 3001
- `MONGODB_URI` — ex.: `mongodb://127.0.0.1:27017/beleza_estrategica`
- `JWT_SECRET` — string forte
- `CORS_ORIGIN` — ex.: `http://localhost:8080` (origem do Vite)

O seed de **procedimentos** roda automaticamente na subida se a collection estiver vazia. Para rodar só o seed: `npm run seed`.

## Rotas principais

- `POST /api/auth/signup`, `POST /api/auth/login`
- `GET /api/me`, `PATCH /api/me` (Bearer)
- `GET /api/procedures`, CRUD pacientes, simulações, `GET /api/dashboard/summary`

Health: `GET /health`
