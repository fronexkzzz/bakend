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
export async function getOtp(phone) {
    return requireCache().otp_codes.find(o => o.phone === phone);
}
export async function incOtpAttempts(phone) {
    const data = requireCache();
    const otp = data.otp_codes.find(o => o.phone === phone);
    if (otp) {
        otp.attempts += 1;
        await save();
    }
}
export async function upsertUser(phone, username, role) {
    const data = requireCache();
    let user = data.users.find(u => u.phone === phone);
    if (!user) {
        user = { id: uuid(), phone, tg_user_id: username ?? null, role: role || 'user', created_at: new Date().toISOString() };
        data.users.push(user);
    }
    else {
        if (username)
            user.tg_user_id = username;
        if (role)
            user.role = role;
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
export async function getOrder(id, phone) {
    return requireCache().orders.find(o => o.id === id && o.user_phone === phone) || null;
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
