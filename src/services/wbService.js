import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const testWB = async () => {
  const token = process.env.WB_TOKEN;

  // Вариант 1: Токен как есть
  // Вариант 2: С префиксом Bearer
  const configs = [
    { name: 'Обычный токен', headers: { 'Authorization': token } },
    { name: 'Bearer токен', headers: { 'Authorization': `Bearer ${token}` } }
  ];

  for (const config of configs) {
    try {
      console.log(`Проверка: ${config.name}...`);
      const response = await axios.get('https://marketplace-api.wildberries.ru/api/v3/warehouses', {
        headers: config.headers
      });
      console.log(`Успех (${config.name})! Склады:`, response.data.length);
      return; // Если сработало, выходим
    } catch (error) {
      console.log(`Ошибка (${config.name}): status ${error.response?.status}`);
      if (error.response?.data?.detail) console.log('Детали:', error.response.data.detail);
    }
  }
  
  console.log('--- ИТОГ ---');
  console.log('Ни один вариант не подошел. Токен, который дал клиент — не "Стандартный токен API".');
  console.log('Клиент должен зайти в: Настройки -> Доступ к API -> Создать новый ключ (выбрать "Стандартный").');
};