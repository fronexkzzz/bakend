import { z } from 'zod';
import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
import { v4 as uuid } from 'uuid';
import { env } from '../env.js';
import { getOtp, incOtpAttempts, upsertOtp, upsertUser } from '../db.js';
import { mtSendCodeUnauth, mtSignInOrUp } from '../telegram/mtproto.js';
const phoneSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/);
async function sendOtpViaGateway(phone, code, requestId, username) {
    const url = (env.TELEGRAM_GATEWAY_API || '').replace(/\/$/, '') || '';
    if (!url)
        return false;
    const payload = { phone, code, request_id: requestId, username };
    try {
        const res = await fetch(`${url}/sendCode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok)
            throw new Error(`gateway ${res.status}`);
        return true;
    }
    catch (e) {
        return false;
    }
}
async function sendOtpFallback(code, phone, username) {
    if (!env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN === 'replace-me')
        return false;
    const chat = env.OTP_FALLBACK_CHAT_ID || (env.TELEGRAM_ADMIN_USERNAMES[0] ? '@' + env.TELEGRAM_ADMIN_USERNAMES[0] : '');
    if (!chat)
        return false;
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: `Код подтверждения для ${phone}${username ? ' (@' + username + ')' : ''}: ${code}` })
    });
    return true;
}
export async function registerAuthRoutes(app) {
    app.post('/request-otp', async (request, reply) => {
        const body = z.object({ phone: phoneSchema, username: z.string().min(2).max(32).optional() }).parse(request.body);
        // Try official MTProto
        try {
            const { phoneCodeHash, timeout, session } = await mtSendCodeUnauth(body.phone);
            const requestId = uuid();
            await upsertOtp({ phone: body.phone, request_id: requestId, expires_at: new Date(Date.now() + timeout * 1000).toISOString(), attempts: 0, created_at: new Date().toISOString(), provider: 'mtproto', phone_code_hash: phoneCodeHash, mt_session: session || '' });
            return { ok: true, requestId, ttl_seconds: timeout };
        }
        catch (e) {
            // fallthrough to local/bot path
        }
        const code = randomInt(100000, 999999).toString();
        const codeHash = await bcrypt.hash(code, 10);
        const requestId = uuid();
        const expiresAt = new Date(Date.now() + 5 * 60000);
        await upsertOtp({ phone: body.phone, code_hash: codeHash, request_id: requestId, expires_at: expiresAt.toISOString(), attempts: 0, created_at: new Date().toISOString(), provider: 'local' });
        const viaGateway = (await sendOtpViaGateway(body.phone, code, requestId, body.username)) === true;
        const viaBot = !viaGateway && ((await sendOtpFallback(code, body.phone, body.username)) === true);
        const delivered = viaGateway || viaBot || env.DEV_RETURN_OTP;
        if (!delivered) {
            return reply.code(502).send({ ok: false, error: 'otp_delivery_failed' });
        }
        const devCodeResp = (!viaGateway && !viaBot && env.DEV_RETURN_OTP) ? code : undefined;
        return { ok: true, requestId, ttl_seconds: 300, devCode: devCodeResp };
    });
    app.post('/verify', async (request, reply) => {
        const body = z.object({ phone: phoneSchema, code: z.string().min(5).max(6), requestId: z.string().uuid().optional(), username: z.string().optional() }).parse(request.body);
        const entry = await getOtp(body.phone);
        if (!entry)
            return reply.code(400).send({ error: 'otp_not_requested' });
        if (body.requestId && entry.request_id !== body.requestId)
            return reply.code(400).send({ error: 'request_mismatch' });
        if (new Date() > new Date(entry.expires_at))
            return reply.code(400).send({ error: 'otp_expired' });
        if (entry.attempts >= 5)
            return reply.code(429).send({ error: 'too_many_attempts' });
        if (entry.provider === 'mtproto' && entry.phone_code_hash && entry.mt_session) {
            try {
                await mtSignInOrUp(body.phone, body.code, entry.phone_code_hash, entry.mt_session);
            }
            catch (e) {
                if (e.message === 'two_factor_enabled')
                    return reply.code(403).send({ error: '2fa_enabled' });
                if (e.message === 'invalid_code')
                    return reply.code(401).send({ error: 'invalid_code' });
                return reply.code(401).send({ error: 'invalid_code' });
            }
        }
        else {
            const matches = await bcrypt.compare(body.code, entry.code_hash || '');
            await incOtpAttempts(body.phone);
            if (!matches)
                return reply.code(401).send({ error: 'invalid_code' });
        }
        const requestedRole = body.username && env.TELEGRAM_ADMIN_USERNAMES.includes(body.username) ? 'admin' : undefined;
        const user = await upsertUser(body.phone, body.username, requestedRole);
        const token = app.jwt.sign({ phone: body.phone, role: user.role, username: body.username }, { expiresIn: '15m' });
        const refresh = app.jwt.sign({ phone: body.phone, role: user.role, username: body.username }, { expiresIn: '30d' });
        return { token, refresh, phone: body.phone, role: user.role };
    });
}
