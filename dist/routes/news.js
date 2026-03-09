import { getNews } from '../db.js';
export async function registerNewsRoutes(app) {
    app.get('/', async () => {
        return await getNews();
    });
}
