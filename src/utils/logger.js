import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const chatId = process.env.TELEGRAM_CHAT_ID;

export const notify = async (message, type = 'INFO') => {
  const icon = type === 'ERROR' ? '❌' : '✅';
  const timestamp = new Date().toLocaleString('ru-RU');
  const text = `${icon} *${type}* | ${timestamp}\n\n${message}`;

  try {
    await bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Ошибка отправки в Telegram:', err.message);
  }
};