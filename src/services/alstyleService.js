import axios from 'axios';
import { Product } from '../models/Product.js';
import { notify } from '../utils/logger.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const syncAlStyle = async () => {
  let currentPage = 1;
  let totalPages = 1;

  do {
    console.log(`Процесс: Страница ${currentPage} из ${totalPages || '?'}`);
    
    try {
      const response = await axios.get('https://api.al-style.kz/api/elements-pagination', {
        params: {
          'access-token': process.env.ALSTYLE_TOKEN,
          'limit': 250,
          'offset': (currentPage - 1) * 250
        }
      });

      const { elements, pagination } = response.data;
      totalPages = pagination.totalPages;

      const bulkOps = elements.map(item => {
        const cleanStock = typeof item.quantity === 'string'
          ? parseInt(item.quantity.replace(/[^\d]/g, '')) || 0
          : item.quantity;

        return {
          updateOne: {
            filter: { article: item.article },
            update: {
              $set: {
                article_pn: item.article_pn,
                name: item.name,
                price_purchase: item.price1,
                stock: cleanStock,
                lastUpdated: new Date()
              }
            },
            upsert: true
          }
        };
      });

      if (bulkOps.length > 0) await Product.bulkWrite(bulkOps);

      currentPage++;
      await sleep(5100); 

    } catch (error) {
      console.error('Ошибка Al-Style:', error.message);
      await notify(`Ошибка при загрузке данных Al-Style: ${error.message}`, 'ERROR');
      await sleep(10000);
    }
  } while (currentPage <= totalPages);
};