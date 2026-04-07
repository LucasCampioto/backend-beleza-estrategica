import { Router } from 'express';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  userToPublic,
  findUserById,
  updateUserById,
} from '../services/users.js';
import { signUserToken } from '../services/jwt.js';

export function createAuthRouter(jwtSecret) {
  const r = Router();

  r.post('/signup', async (req, res) => {
    try {
      const { name, clinic, email, password } = req.body || {};
      if (!name || !email || !password) {
        res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios' });
        return;
      }
      const existing = await findUserByEmail(email);
      if (existing) {
        res.status(409).json({ message: 'E-mail já cadastrado' });
        return;
      }
      const user = await createUser({ name, clinic, email, password });
      const token = signUserToken(user._id, jwtSecret);
      res.status(201).json({ token, user: userToPublic(user) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Erro ao cadastrar' });
    }
  });

  r.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
        return;
      }
      const user = await findUserByEmail(email);
      if (!user || !(await verifyPassword(user, password))) {
        res.status(401).json({ message: 'E-mail ou senha inválidos' });
        return;
      }
      const token = signUserToken(user._id, jwtSecret);
      res.json({ token, user: userToPublic(user) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Erro ao entrar' });
    }
  });

  return r;
}

export function createMeRouter(jwtSecret, requireAuth) {
  const r = Router();
  r.use(requireAuth);

  r.get('/me', async (req, res) => {
    try {
      const user = await findUserById(req.userId);
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }
      res.json(userToPublic(user));
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Erro ao carregar perfil' });
    }
  });

  r.patch('/me', async (req, res) => {
    try {
      const user = await updateUserById(req.userId, req.body || {});
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }
      res.json(userToPublic(user));
    } catch (e) {
      if (e.code === 11000) {
        res.status(409).json({ message: 'E-mail já em uso' });
        return;
      }
      console.error(e);
      res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
  });

  return r;
}
