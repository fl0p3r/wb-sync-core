# Universal Sync Engine

> **Движок автоматизации товарного учёта и синхронизации данных** между поставщиком (Al-Style), внутренней базой (MongoDB), Google Таблицами и маркетплейсами.

---

## Содержание

- [Архитектура](#архитектура)
- [Стек технологий](#стек-технологий)
- [Структура проекта](#структура-проекта)
- [Схема данных](#схема-данных)
- [Описание модулей](#описание-модулей)
  - [Точка входа — `src/index.js`](#точка-входа---srcindexjs)
  - [Al-Style (поставщик) — `alstyleService.js`](#al-style-поставщик---alstyleservicejs)
  - [Google Sheets — `googleSheetsService.js`](#google-sheets---googlesheetsservicejs)
  - [МойСклад — `moyskladService.js`](#мойсклад---moyskladservicejs)
  - [Wildberries — `wbService.js`](#wildberries---wbservicejs)
  - [Telegram-логирование — `logger.js`](#telegram-логирование---loggerjs)
- [Полный цикл работы](#полный-цикл-работы)
- [Переменные окружения](#переменные-окружения)
- [Запуск](#запуск)

---

## Архитектура

```
┌──────────────┐     ┌──────────┐     ┌────────────────┐
│  Al-Style    │────▶│ MongoDB  │◀───▶│ Google Sheets  │
│  (API)       │     │(Mongoose)│     │   (v4 API)     │
└──────────────┘     └──────────┘     └────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Маркетплейсы │
                    │  (WB и др.)  │
                    └──────────────┘
```

Данные движутся в одном направлении: **поставщик → база → таблица → маркетплейсы**. Пользователь редактирует наценки в Google Sheets, система читает изменения и пересчитывает цены.

---

## Стек технологий

| Компонент          | Технология                              |
|--------------------|-----------------------------------------|
| **Runtime**        | Node.js (ESM)                           |
| **База данных**    | MongoDB + Mongoose ODM                  |
| **API-запросы**    | Axios                                   |
| **Google Sheets**  | google-spreadsheet + google-auth-library |
| **Telegram-бот**   | Telegraf                                |
| **Переменные**     | dotenv                                  |

---

## Структура проекта

```
project-root/
├── src/
│   ├── config/
│   │   ├── db.js                 # Подключение к MongoDB
│   │   └── google-creds.json     # Сервисный аккаунт Google (игнор)
│   ├── models/
│   │   └── Product.js            # Mongoose-схема товара
│   ├── services/
│   │   ├── alstyleService.js     # Импорт товаров из Al-Style
│   │   ├── googleSheetsService.js# Двусторонняя синхр. с Google Sheets
│   │   ├── moyskladService.js    # Интеграция с МойСклад
│   │   └── wbService.js          # Интеграция с Wildberries
│   ├── utils/
│   │   └── logger.js             # Telegram-уведомления
│   └── index.js                  # Точка входа
├── .env                          # Переменные окружения
├── package.json
└── README.md
```

---

## Схема данных

Коллекция `products` в MongoDB:

| Поле            | Тип    | Описание                        |
|-----------------|--------|---------------------------------|
| `article`       | Number | Артикул товара (уникальный)      |
| `name`          | String | Название товара                  |
| `price_purchase`| Number | Закупочная цена (из Al-Style)    |
| `stock`         | Number | Остаток на складе                |
| `markup`        | Number | Наценка в % (по умолчанию 20)    |
| `price_final`   | Number | Итоговая цена = закуп + наценка  |
| `lastUpdated`   | Date   | Дата последнего обновления       |

---

## Описание модулей

### Точка входа — `src/index.js`

Последовательность при запуске:

1. Подключение к MongoDB
2. Выгрузка всех товаров из БД в Google Sheets
3. Ожидание 15 секунд (пользователь правит наценки в таблице)
4. Чтение наценок из таблицы и пересчёт `price_final`
5. Завершение процесса

### Al-Style (поставщик) — `alstyleService.js`

- Запрос к `api.al-style.kz/api/elements-pagination`
- Пагинация по 250 элементов с соблюдением rate limit (1 запрос / 5 сек)
- Парсинг остатка: строка `">50"` → число `50`
- Upsert товаров в MongoDB через `bulkWrite`
- Уведомление об ошибках в Telegram

### Google Sheets — `googleSheetsService.js`

Два направления синхронизации:

**1. Выгрузка в таблицу (`updateSheetData`)**
- Очищает лист
- Записывает header: `Артикул | Название | Закуп | Остаток | Наценка % | Итоговая цена`
- Добавляет все товары из MongoDB строками

**2. Чтение из таблицы (`syncMarkupFromSheet`)**
- Читает колонки `Артикул` и `Наценка %`
- Рассчитывает `price_final = закуп × (1 + наценка / 100)`
- Обновляет цены в MongoDB пачкой (`bulkWrite`)

### МойСклад — `moyskladService.js`

- Проверка подключения к API МойСклад (Basic Auth)
- Запрос одного товара для валидации токена
- На данный момент используется только для диагностики

### Wildberries — `wbService.js`

- Проверка подключения к API Wildberries
- Тестирует два формата авторизации (токен как есть и с префиксом `Bearer`)
- На данный момент используется только для диагностики

### Telegram-логирование — `logger.js`

- Отправка уведомлений о статусе операций
- Два уровня: `INFO` (✅) и `ERROR` (❌)
- Markdown-форматирование с временной меткой

---

## Полный цикл работы

```
 1. syncAlStyle()          — загрузка товаров из Al-Style в MongoDB
 2. updateSheetData()      — выгрузка MongoDB → Google Sheets
 3. [пользователь]         — редактирует колонку "Наценка %" в таблице
 4. syncMarkupFromSheet()  — чтение наценок → пересчёт цен → запись в БД
 5. [интеграция с WB/МС]   — выгрузка финальных цен на маркетплейсы
```

На данный момент шаги 1 и 5 требуют ручного вызова соответствующих функций.

---

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/your-db

# Al-Style
ALSTYLE_TOKEN=your_alstyle_token

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id

# Wildberries
WB_TOKEN=your_wb_token

# МойСклад
MOYSKLAD_LOGIN=your_login
MOYSKLAD_PASS=your_password

# Telegram
TELEGRAM_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

> Для Google Sheets требуется также файл `src/config/google-creds.json` с ключами сервисного аккаунта.

---

## Запуск

```bash
npm install
node src/index.js
```

Для запуска синхронизации с Al-Style:

```bash
node -e "import('./src/services/alstyleService.js').then(m => m.syncAlStyle())"
```