import { FastifyInstance } from 'fastify';
import { getProducts } from '../db.js';

export async function registerCatalogRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return await getProducts();
  });
}
