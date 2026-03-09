import { z } from 'zod';
import { addNews, addProduct, getStats } from '../db.js';
function assertAdmin(req, reply) {
    if (!req.user || req.user.role !== 'admin') {
        reply.code(403).send({ error: 'forbidden' });
        return false;
    }
    return true;
}
export async function registerAdminRoutes(app) {
    app.addHook('preHandler', async (req, reply) => {
        if (req.routerPath?.startsWith('/admin')) {
            if (!assertAdmin(req, reply))
                return;
        }
    });
    app.post('/products', async (request) => {
        const body = z.object({ title: z.string(), price: z.number(), stock: z.number().int().nonnegative(), tags: z.array(z.string()).optional() }).parse(request.body);
        const item = await addProduct({ title: body.title, price: body.price, stock: body.stock, tags: body.tags ?? [], images: [] });
        return { ok: true, product: item };
    });
    app.post('/news', async (request) => {
        const body = z.object({ title: z.string(), type: z.string(), body: z.string(), promoCode: z.string().nullable().optional(), startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional() }).parse(request.body);
        await addNews({ title: body.title, type: body.type, body: body.body, promo_code: body.promoCode ?? null, starts_at: body.startsAt ?? null, ends_at: body.endsAt ?? null });
        return { ok: true };
    });
    app.get('/stats', async () => {
        return await getStats();
    });
}
