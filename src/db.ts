import { promises as fs } from 'fs';
import { resolve } from 'path';
import { v4 as uuid } from 'uuid';

export type DBUser = { id: string; phone: string; tg_user_id?: string | null; role: 'user' | 'admin'; created_at: string };
export type DBOtp = { phone: string; code_hash?: string; request_id: string; expires_at: string; attempts: number; created_at: string; provider: 'local' | 'mtproto'; phone_code_hash?: string; mt_session?: string };
export type DBProduct = { id: string; title: string; description?: string | null; price: number; stock: number; tags: string[]; images: string[]; created_at: string };
export type DBNews = { id: string; title: string; type: string; body: string; promo_code?: string | null; starts_at?: string | null; ends_at?: string | null; created_at: string };
export type DBOrder = { id: string; user_phone: string; status: string; items: any; total: number; margin?: number | null; revenue?: number | null; created_at: string };

export type DBData = {
  users: DBUser[];
  otp_codes: DBOtp[];
  products: DBProduct[];
  news: DBNews[];
  orders: DBOrder[];
};

const dataFile = resolve(process.cwd(), 'data.json');
let cache: DBData | null = null;

export async function initDb() {
  try {
    const buf = await fs.readFile(dataFile, 'utf-8');
    cache = JSON.parse(buf);
  } catch {
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

function requireCache(): DBData {
  if (!cache) throw new Error('DB not initialized');
  return cache;
}

async function save() {
  if (!cache) return;
  await fs.writeFile(dataFile, JSON.stringify(cache, null, 2));
}

export async function getProducts() { return requireCache().products; }
export async function getNews() { return requireCache().news; }

export async function addProduct(p: Omit<DBProduct, 'id' | 'created_at'>) {
  const data = requireCache();
  const item: DBProduct = { ...p, id: uuid(), created_at: new Date().toISOString() };
  data.products.unshift(item);
  await save();
  return item;
}

export async function addNews(n: Omit<DBNews, 'id' | 'created_at'>) {
  const data = requireCache();
  const item: DBNews = { ...n, id: uuid(), created_at: new Date().toISOString() };
  data.news.unshift(item);
  await save();
  return item;
}

export async function upsertOtp(entry: DBOtp) {
  const data = requireCache();
  const idx = data.otp_codes.findIndex(o => o.phone === entry.phone);
  if (idx >= 0) data.otp_codes[idx] = entry; else data.otp_codes.push(entry);
  await save();
}

export async function getOtp(phone: string) {
  return requireCache().otp_codes.find(o => o.phone === phone);
}

export async function incOtpAttempts(phone: string) {
  const data = requireCache();
  const otp = data.otp_codes.find(o => o.phone === phone);
  if (otp) { otp.attempts += 1; await save(); }
}

export async function upsertUser(phone: string, username?: string | null, role?: 'user' | 'admin') {
  const data = requireCache();
  let user = data.users.find(u => u.phone === phone);
  if (!user) {
    user = { id: uuid(), phone, tg_user_id: username ?? null, role: role || 'user', created_at: new Date().toISOString() };
    data.users.push(user);
  } else {
    if (username) user.tg_user_id = username;
    if (role) user.role = role;
  }
  await save();
  return user;
}

export async function createOrder(order: Omit<DBOrder, 'id' | 'created_at'>) {
  const data = requireCache();
  const item: DBOrder = { ...order, id: uuid(), created_at: new Date().toISOString() };
  data.orders.unshift(item);
  await save();
  return item;
}

export async function getOrder(id: string, phone: string) {
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
