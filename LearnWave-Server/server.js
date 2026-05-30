const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});
// Настройка подключения к PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => {
  console.log('?? [Pool Log]: База данных открыла новое соединение client.');
});

pool.on('error', (err, client) => {
  console.error('? [Pool Critical Error]: Непредвиденная ошибка клиента базы данных:', err.message);
});

// Проверим, сколько подключений сейчас занято
setInterval(async () => {
  console.log(`?? [Pool Status]: Всего коннектов: ${pool.totalCount} | Свободно: ${pool.idleCount} | Ожидают в очереди: ${pool.waitingCount}`);
}, 5000); // будет писать статус каждые 5 секунд в терминал бэкенда
// ============================================================

// Проверка связи с базой
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('? Ошибка подключения к PostgreSQL:', err);
  else console.log('? База PostgreSQL подключена');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`?? Сервер LearnWave запущен на порту ${PORT}`));
