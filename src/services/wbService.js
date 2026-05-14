import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const testWB = async () => {
  const token = process.env.WB_TOKEN;

  const configs = [
    { name: 'Без префикса', headers: { 'Authorization': token } },
    { name: 'С префиксом Bearer', headers: { 'Authorization': `Bearer ${token}` } }
  ];

  for (const config of configs) {
    try {
      console.log(`Проверка: ${config.name}...`);
      const response = await axios.get('https://marketplace-api.wildberries.ru/api/v3/warehouses', {
        headers: config.headers
      });
      console.log(`Успех (${config.name})! Склады:`, response.data.length);
      return;
    } catch (error) {
      console.log(`Ошибка (${config.name}): status ${error.response?.status}`);
      if (error.response?.data?.detail) console.log('Детали:', error.response.data.detail);
    }
  }

  console.log('---');
  console.log('Токен WB не прошёл проверку. Убедитесь, что используется "Стандартный токен API" (Настройки → Доступ к API).');
};