export const env = {
    PORT: Number(process.env.PORT || 3001),
    DATABASE_URL: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/everyday',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_ADMIN_USERNAMES: (process.env.TELEGRAM_ADMIN_USERNAMES || 'frxkq').split(',').map(s => s.trim()).filter(Boolean),
    TELEGRAM_GATEWAY_API: process.env.TELEGRAM_GATEWAY_API || '',
    WEBAPP_URL: process.env.WEBAPP_URL || 'https://cr380665.tw1.ru',
    OTP_FALLBACK_CHAT_ID: process.env.OTP_FALLBACK_CHAT_ID || '@frxkq',
    DEV_RETURN_OTP: (process.env.DEV_RETURN_OTP || 'false').toLowerCase() === 'true',
    TELEGRAM_API_ID: Number(process.env.TELEGRAM_API_ID || 33969373),
    TELEGRAM_API_HASH: process.env.TELEGRAM_API_HASH || 'fef69f4135b05300c8124b80bba9141a',
};
