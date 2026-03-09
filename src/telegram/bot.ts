import TelegramBot from 'node-telegram-bot-api';
import { env as defaultEnv } from '../env.js';

let bot: TelegramBot | null = null;

export function getBot() {
  return bot;
}

export async function createBot(env = defaultEnv) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN не задан: бот не запущен');
    return null;
  }

  bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });

  bot.onText(/\/start/, (msg: TelegramBot.Message) => {
    bot!.sendMessage(msg.chat.id, 'Добро пожаловать! Откройте мини-аппу через кнопку', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Открыть каталог', web_app: { url: env.WEBAPP_URL } }]],
      },
    });
  });

  bot.onText(/\/admin(?:\s+(.+))?/, async (msg: TelegramBot.Message, match: RegExpMatchArray | null) => {
    const username = msg.from?.username || '';
    if (!env.TELEGRAM_ADMIN_USERNAMES.includes(username)) {
      return bot!.sendMessage(msg.chat.id, 'Нет доступа');
    }

    const cmd = (match?.[1] || '').trim();
    if (!cmd || cmd === 'help') {
      return bot!.sendMessage(msg.chat.id, 'Доступно: stats — сводка, users — всего пользователей, catalog — последние товары.');
    }

    // Заглушки: без БД пулинга
    return bot!.sendMessage(msg.chat.id, 'Команды stats/users/catalog отключены в file-DB режиме');
  });

  bot.on('polling_error', (err: any) => console.error(err));
  return bot;
}
