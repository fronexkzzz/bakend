import { FastifyInstance } from 'fastify';
import { getNews } from '../db.js';

export async function registerNewsRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return await getNews();
  });
}
