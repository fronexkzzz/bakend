import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createOrder, getOrder } from '../db.js';
import { getBot } from '../telegram/bot.js';
import { env } from '../env.js';

export async function registerOrdersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req, reply) => {
    if (!req.user) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.post('/', async (request, reply) => {
    const body = z
      .object({
        items: z.array(z.object({ productId: z.string(), qty: z.number().int().positive() })),
        total: z.number().nonnegative(),
        margin: z.number().optional(),
        revenue: z.number().optional(),
      })
      .parse(request.body);

    const userPhone = (request as any).user.phone;
    const order = await createOrder({ user_phone: userPhone, status: 'new', items: body.items, total: body.total, margin: body.margin ?? null, revenue: body.revenue ?? null });

    const bot = getBot();
    if (bot && env.TELEGRAM_ADMIN_USERNAMES.length) {
      const text = `Новый заказ ${order.id}\nПользователь: ${userPhone}\nСумма: ${body.total}`;
      for (const username of env.TELEGRAM_ADMIN_USERNAMES) {
        bot.sendMessage(`@${username}`, text).catch(() => {});
      }
    }

    return { id: order.id, status: order.status };
  });

  app.get('/:id', async (request, reply) => {
    const orderId = (request.params as any).id;
    const userPhone = (request as any).user.phone;
    const order = await getOrder(orderId, userPhone);
    if (!order) return reply.code(404).send({ error: 'not_found' });
    return order;
  });
}
