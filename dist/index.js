import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import { registerAuthRoutes } from './routes/auth.js';
import { registerCatalogRoutes } from './routes/catalog.js';
import { registerNewsRoutes } from './routes/news.js';
import { registerOrdersRoutes } from './routes/orders.js';
import { registerAdminRoutes } from './routes/admin.js';
import { createBot } from './telegram/bot.js';
import { env } from './env.js';
import { initDb } from './db.js';
const app = Fastify({ logger: true });
app.register(cors, { origin: true });
app.register(helmet);
app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
app.register(fastifyJwt, { secret: env.JWT_SECRET });
app.addHook('preHandler', async (req, reply) => {
    try {
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            await req.jwtVerify();
        }
    }
    catch (err) {
        // ignore missing token for public routes
    }
});
app.register(registerAuthRoutes, { prefix: '/auth' });
app.register(registerCatalogRoutes, { prefix: '/catalog' });
app.register(registerNewsRoutes, { prefix: '/news' });
app.register(registerOrdersRoutes, { prefix: '/orders' });
app.register(registerAdminRoutes, { prefix: '/admin' });
const start = async () => {
    await initDb();
    await createBot(env);
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`API listening on ${env.PORT}`);
};
start().catch((err) => {
    app.log.error(err);
    process.exit(1);
});
