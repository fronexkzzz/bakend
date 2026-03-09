import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { addNews } from '../db.js';

function assertAdmin(req: any, reply: any) {
  if (!req.user || req.user.role !== 'admin') {
    reply.code(403).send({ error: 'forbidden' });
    return false;
  }
  return true;
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req, reply) => {
    if (req.routerPath?.startsWith('/admin')) {
      if (!assertAdmin(req, reply)) return;
    }
  });

  app.post('/products', async (request) => {
    // removed products admin to simplify; keep news and stats
    return { ok: false, error: 'products_admin_disabled' };
  });

  app.post('/news', async (request) => {
    const body = z.object({ title: z.string(), type: z.string(), body: z.string(), promoCode: z.string().nullable().optional(), startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional() }).parse(request.body);
    await addNews({ title: body.title, type: body.type, body: body.body, promo_code: body.promoCode ?? null, starts_at: body.startsAt ?? null, ends_at: body.endsAt ?? null });
    return { ok: true };
  });

  app.get('/stats', async () => {
    return { users: 0, orders: 0, revenue: 0, margin: 0 }; // simplified for file DB
  });
}
