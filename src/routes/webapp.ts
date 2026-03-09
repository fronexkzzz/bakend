import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { env } from '../env.js';
import { upsertUserByTg } from '../db.js';

function parseInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('hash_missing');
  params.delete('hash');
  const entries = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(env.TELEGRAM_BOT_TOKEN).digest();
  const signature = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (signature !== hash) throw new Error('hash_invalid');
  const userStr = params.get('user');
  if (!userStr) throw new Error('user_missing');
  return JSON.parse(userStr);
}

export async function registerWebAppAuth(app: FastifyInstance) {
  app.post('/webapp', async (request, reply) => {
    const body = z.object({ initData: z.string().min(1) }).parse(request.body);
    if (!env.TELEGRAM_BOT_TOKEN) return reply.code(500).send({ error: 'bot_token_missing' });

    let user;
    try {
      user = parseInitData(body.initData);
    } catch (e: any) {
      return reply.code(400).send({ error: 'invalid_initdata', detail: e.message });
    }

    const payload = {
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      phone: user.phone_number ?? null,
      avatar: user.photo_url ?? null,
      role: env.TELEGRAM_ADMIN_USERNAMES.includes(user.username || '') ? 'admin' as const : 'user' as const,
    };

    const dbUser = await upsertUserByTg(user.id, payload);
    const token = app.jwt.sign({ tg_id: user.id, role: dbUser.role, username: dbUser.username, name: `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim(), avatar: dbUser.avatar, user_id: dbUser.id }, { expiresIn: '30d' });
    return {
      token,
      role: dbUser.role,
      username: dbUser.username,
      first_name: dbUser.first_name,
      last_name: dbUser.last_name,
      avatar: dbUser.avatar,
      phone: dbUser.phone,
      id: dbUser.id,
      tg_id: dbUser.tg_id,
    };
  });

  app.post('/profile', async (request, reply) => {
    try { await request.jwtVerify(); } catch { return reply.code(401).send({ error: 'unauthorized' }); }
    const body = z.object({ phone: z.string().min(6).max(18).optional(), avatar: z.string().url().optional() }).parse(request.body || {});
    const auth = (request as any).user as any;
    const dbUser = await upsertUserByTg(auth.tg_id, { phone: body.phone ?? undefined, avatar: body.avatar ?? undefined });
    return { phone: dbUser.phone, avatar: dbUser.avatar };
  });
}
