import { connectDB } from './config/db.js';
import { updateSheetData, syncMarkupFromSheet } from './services/googleSheetsService.js';

const start = async () => {
  await connectDB();
  
  // 1. Выгружаем всё в таблицу
  await updateSheetData();

  console.log('Сделано. Теперь иди в таблицу, измени "Наценку %" у первых 5 товаров.');
  console.log('Жду 15 секунд и начинаю сохранение в базу...');

  setTimeout(async () => {
    // 2. Читаем из таблицы и считаем цены
    await syncMarkupFromSheet();
    console.log('Процесс завершен. Проверь базу (MongoDB Compass), поле price_final изменилось.');
    process.exit(0);
  }, 15000);
};

start();