import { connectDB } from './config/db.js';
import { updateSheetData, syncMarkupFromSheet } from './services/googleSheetsService.js';

const start = async () => {
  await connectDB();
  
  await updateSheetData();

  console.log('Данные выгружены в таблицу. Отредактируйте наценки — через 15 с система их применит.');
  console.log('Ожидание 15 с...');

  setTimeout(async () => {
    await syncMarkupFromSheet();
    console.log('Готово. Цены пересчитаны.');
    process.exit(0);
  }, 15000);
};

start();