import nodemailer from 'nodemailer';

function loginUrlDefault() {
  const explicit = process.env.FRONTEND_LOGIN_URL?.trim();
  if (explicit) return explicit;
  const origin = process.env.CORS_ORIGIN?.trim() || 'http://localhost:8080';
  return `${origin.replace(/\/$/, '')}/login`;
}

export async function sendSubscriptionWelcomeEmail({ to, tempPassword, loginUrl }) {
  const url = loginUrl || loginUrlDefault();
  const subject = 'Sua conta — acesso e assinatura';
  const text = [
    'Sua assinatura foi ativada.',
    '',
    `E-mail de login: ${to}`,
    `Senha temporária: ${tempPassword}`,
    '',
    `Entre em: ${url}`,
    '',
    'Recomendamos alterar a senha após o primeiro acesso.',
  ].join('\n');

  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    console.warn('[email] SMTP_HOST não configurado — conteúdo do e-mail (simulação):');
    console.warn(text);
    return;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim() || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
}
