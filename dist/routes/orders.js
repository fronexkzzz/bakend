import { z } from 'zod';
import { createOrder, getOrder, listOrdersByUser } from '../db.js';
export async function registerOrdersRoutes(app) {
    app.addHook('preHandler', async (req, reply) => {
        try {
            await req.jwtVerify();
        }
        catch {
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
        const userId = request.user.user_id;
        const order = await createOrder({ user_id: userId, status: 'new', items: body.items, total: body.total, margin: body.margin ?? null, revenue: body.revenue ?? null });
        return { id: order.id, status: order.status };
    });
    app.get('/my', async (request) => {
        const userId = request.user.user_id;
        const orders = await listOrdersByUser(userId);
        return orders;
    });
    app.get('/:id', async (request, reply) => {
        const orderId = request.params.id;
        const userId = request.user.user_id;
        const order = await getOrder(orderId, userId);
        if (!order)
            return reply.code(404).send({ error: 'not_found' });
        return order;
    });
}
