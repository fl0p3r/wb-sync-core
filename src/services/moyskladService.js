import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const auth = Buffer.from(`${process.env.MOYSKLAD_LOGIN}:${process.env.MOYSKLAD_PASS}`).toString('base64');

const msApi = axios.create({
  // Исправленный URL
  baseURL: 'https://api.moysklad.ru/api/remap/1.2', 
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip'
  }
});

export const testMS = async () => {
  try {
    console.log('Проверка связи с МойСклад (через api.moysklad.ru)...');
    const response = await msApi.get('/entity/product', {
      params: { limit: 1 }
    });
    
    if (response.data.rows && response.data.rows.length > 0) {
      console.log('Связь с МойСклад ОК!');
      console.log(JSON.stringify(response.data.rows[0], null, 2));
    } else {
      console.log('Доступ есть, но товаров в МС нет. Создай один товар вручную для теста.');
    }
  } catch (error) {
    // Выводим детальную ошибку
    console.error('Ошибка МойСклад:', error.response?.data || error.message);
  }
};