import { FastifyInstance } from 'fastify';

// Legacy OTP endpoints are disabled because login now uses Telegram WebApp auth.
export async function registerAuthRoutes(app: FastifyInstance) {
  app.all('/request-otp', async (_req, reply) => reply.code(410).send({ ok: false, error: 'otp_disabled', message: 'Используйте вход через Telegram WebApp' }));
  app.all('/verify', async (_req, reply) => reply.code(410).send({ ok: false, error: 'otp_disabled', message: 'Используйте вход через Telegram WebApp' }));
}
