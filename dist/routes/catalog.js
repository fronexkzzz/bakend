import { getProducts } from '../db.js';
export async function registerCatalogRoutes(app) {
    app.get('/', async () => {
        return await getProducts();
    });
}
