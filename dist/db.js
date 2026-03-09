import { promises as fs } from 'fs';
import { resolve } from 'path';
import { v4 as uuid } from 'uuid';
const dataFile = resolve(process.cwd(), 'data.json');
let cache = null;
export async function initDb() {
    try {
        const buf = await fs.readFile(dataFile, 'utf-8');
        cache = JSON.parse(buf);
    }
    catch {
        cache = {
            users: [],
            otp_codes: [],
            products: [
                { id: uuid(), title: 'Букет Classic', description: 'Оранжевый акцент', price: 3200, stock: 12, tags: ['new'], images: [], created_at: new Date().toISOString() },
                { id: uuid(), title: 'Everyday bunch', description: 'Ежедневный набор', price: 2800, stock: 8, tags: ['hit'], images: [], created_at: new Date().toISOString() },
            ],
            news: [
                { id: uuid(), title: 'Новая поставка', type: 'supply', body: 'Свежие тюльпаны и эустома', promo_code: null, starts_at: null, ends_at: null, created_at: new Date().toISOString() },
                { id: uuid(), title: 'Скидка 10%', type: 'discount', body: 'Промокод SPRING10', promo_code: 'SPRING10', starts_at: null, ends_at: null, created_at: new Date().toISOString() },
            ],
            orders: [],
        };
        await save();
    }
    migrateLegacy();
}
function requireCache() {
    if (!cache)
        throw new Error('DB not initialized');
    return cache;
}
async function save() {
    if (!cache)
        return;
    await fs.writeFile(dataFile, JSON.stringify(cache, null, 2));
}
// migrate legacy phone-based users/orders to tg-based minimal
function migrateLegacy() {
    const data = requireCache();
    // if orders use user_phone, rename to user_id by creating tg_id stub
    // skip if already migrated
    if (data.orders[0]?.user_phone) {
        for (const ord of data.orders) {
            const phone = ord.user_phone;
            let user = data.users.find(u => u.phone === phone);
            if (!user) {
                user = { id: uuid(), tg_id: Date.now(), phone, role: 'user', created_at: new Date().toISOString() };
                data.users.push(user);
            }
            ord.user_id = user.id;
            delete ord.user_phone;
        }
    }
}
export async function getProducts() { return requireCache().products; }
export async function getNews() { return requireCache().news; }
export async function addProduct(p) {
    const data = requireCache();
    const item = { ...p, id: uuid(), created_at: new Date().toISOString() };
    data.products.unshift(item);
    await save();
    return item;
}
export async function addNews(n) {
    const data = requireCache();
    const item = { ...n, id: uuid(), created_at: new Date().toISOString() };
    data.news.unshift(item);
    await save();
    return item;
}
export async function upsertOtp(entry) {
    const data = requireCache();
    const idx = data.otp_codes.findIndex(o => o.phone === entry.phone);
    if (idx >= 0)
        data.otp_codes[idx] = entry;
    else
        data.otp_codes.push(entry);
    await save();
}
export async function getOtp(phone) { return requireCache().otp_codes.find(o => o.phone === phone); }
export async function incOtpAttempts(phone) { const data = requireCache(); const otp = data.otp_codes.find(o => o.phone === phone); if (otp) {
    otp.attempts += 1;
    await save();
} }
export async function upsertUserByTg(tg_id, payload) {
    const data = requireCache();
    let user = data.users.find(u => u.tg_id === tg_id);
    if (!user) {
        user = {
            id: uuid(), tg_id, role: 'user', created_at: new Date().toISOString(),
            username: payload.username ?? null,
            first_name: payload.first_name ?? null,
            last_name: payload.last_name ?? null,
            phone: payload.phone ?? null,
            avatar: payload.avatar ?? null,
        };
        data.users.push(user);
    }
    else {
        user.username = payload.username ?? user.username;
        user.first_name = payload.first_name ?? user.first_name;
        user.last_name = payload.last_name ?? user.last_name;
        user.phone = payload.phone ?? user.phone;
        user.avatar = payload.avatar ?? user.avatar;
        if (payload.role)
            user.role = payload.role;
    }
    await save();
    return user;
}
export async function createOrder(order) {
    const data = requireCache();
    const item = { ...order, id: uuid(), created_at: new Date().toISOString() };
    data.orders.unshift(item);
    await save();
    return item;
}
export async function getOrder(id, userId) {
    return requireCache().orders.find(o => o.id === id && o.user_id === userId) || null;
}
export async function listOrdersByUser(userId) {
    return requireCache().orders.filter(o => o.user_id === userId);
}
export async function getStats() {
    const data = requireCache();
    return {
        users: data.users.length,
        orders: data.orders.length,
        revenue: data.orders.reduce((s, o) => s + (o.revenue ?? o.total ?? 0), 0),
        margin: data.orders.reduce((s, o) => s + (o.margin ?? 0), 0),
    };
}
