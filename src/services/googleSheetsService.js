import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { readFileSync } from 'fs';
import path from 'path';
import { Product } from '../models/Product.js';
import { notify } from '../utils/logger.js'; // Вернул логгер
import dotenv from 'dotenv';
dotenv.config();

const credsPath = path.resolve('./src/config/google-creds.json');
const creds = JSON.parse(readFileSync(credsPath, 'utf8'));

const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

// 1. Выгрузка из базы в таблицу
export const updateSheetData = async () => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const products = await Product.find();

    await sheet.clear();
    await sheet.setHeaderRow(['Артикул', 'Название', 'Закуп', 'Остаток', 'Наценка %', 'Итоговая цена']);

    const rows = products.map(p => ({
      'Артикул': String(p.article),
      'Название': p.name,
      'Закуп': p.price_purchase,
      'Остаток': p.stock,
      'Наценка %': p.markup || 20,
      'Итоговая цена': p.price_final || Math.round(p.price_purchase * 1.2)
    }));

    await sheet.addRows(rows);
    
    console.log('Таблица обновлена.');
    await notify(`Данные выгружены в таблицу. Всего товаров: ${products.length}`);
  } catch (error) {
    console.error('Ошибка записи в таблицу:', error.message);
    await notify(`Ошибка записи в таблицу: ${error.message}`, 'ERROR');
  }
};

// 2. Чтение наценок из таблицы в базу
export const syncMarkupFromSheet = async () => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const bulkOps = rows.map(row => {
      const art = Number(row.get('Артикул'));
      const mup = parseFloat(row.get('Наценка %')) || 20;
      const pur = parseFloat(row.get('Закуп'));
      const final = Math.round(pur * (1 + mup / 100));

      return {
        updateOne: {
          filter: { article: art },
          update: { $set: { markup: mup, price_final: final } }
        }
      };
    });

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
      console.log('Наценки синхронизированы.');
      await notify(`Наценки из таблицы успешно применены к базе (${bulkOps.length} шт.)`);
    }
  } catch (error) {
    console.error('Ошибка чтения таблицы:', error.message);
    await notify(`Ошибка чтения таблицы: ${error.message}`, 'ERROR');
  }
};