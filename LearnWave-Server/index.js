const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
// Принудительная кодировка UTF-8 для всех ответов сервера
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Логирование запросов в консоль
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] Запрос: ${req.method} ${req.url}`);
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

pool.connect((err) => {
  if (err) console.error('?? Ошибка подключения к PostgreSQL:', err.stack);
  else console.log('?? База PostgreSQL подключена успешно');
});

// ==========================================
// MIDDLEWARES (БЕЗОПАСНОСТЬ)
// ==========================================

// 1. Общая проверка авторизации по JWT-токену
const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Доступ запрещен. Токен отсутствует.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Записываем данные юзера (id, role) в объект запроса
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Сессия истекла. Войдите заново.' });
  }
};

// 2. Ролевая безопасность (RBAC): Проверка прав Администратора
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    console.warn(`?? [Блокировка]: Попытка доступа к админке! ID: ${req.user ? req.user.id : 'Неизвестен'}`);
    return res.status(403).json({ success: false, error: 'Доступ запрещен: требуются права администратора.' });
  }
  next();
};

// ==========================================
// ОСНОВНЫЕ МАРШРУТЫ ПРИЛОЖЕНИЯ (СОХРАНЕНЫ)
// ==========================================

// 1. РЕГИСТРАЦИЯ ЮЗЕРА (Уникален ТОЛЬКО email, имена могут повторяться!)
app.post('/api/register', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ success: false, error: 'Заполните все обязательные поля.' });
  }

  // Приводим email к нижнему регистру и убираем пробелы по краям для точной проверки
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.trim();

  try {
    // Проверяем только email. Каждая буква и цифра имеют значение!
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Пользователь с такой почтой уже существует.' });
    }

    // Хэшируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Записываем в базу данных
    const result = await pool.query(
      'INSERT INTO users (email, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role',
      [normalizedEmail, normalizedUsername, hashedPassword, 'student'] // По умолчанию роль student
    );

    console.log(`[?? Регистрация]: Успешно создан пользователь: ${normalizedUsername} (${normalizedEmail})`);
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('? Ошибка записи регистрации в PostgreSQL:', err.message);
    res.status(500).json({ success: false, error: 'Внутренняя ошибка базы данных.' });
  }
});



// 2. АВТОРИЗАЦИЯ (ВХОД) — ФИКС ОБЪЕКТА ЮЗЕРА
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Заполните все поля.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Неверный email или пароль.' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Неверный email или пароль.' });
    }

    // Обновляем стрик активности
    let newStreak = user.streak_count || 0;
    const today = new Date().toISOString().split('T')[0]; // Текущая дата (ГГГГ-ММ-ДД)

    if (user.last_login) {
      const lastLoginDate = new Date(user.last_login).toISOString().split('T')[0];

      if (lastLoginDate !== today) {
        const diffTime = Math.abs(new Date(today) - new Date(lastLoginDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak += 1; // Зашел на следующий день
        } else if (diffDays > 1) {
          newStreak = 1;  // Пропустил дни -> сброс в 1
        }
      }
    } else {
      newStreak = 1; // Самый первый вход
    }

    await pool.query(
      'UPDATE users SET streak_count = $1, last_login = CURRENT_DATE WHERE id = $2',
      [newStreak, user.id]
    );

    // Зашиваем id и роль в JWT-токен
    const token = jwt.sign(
      { id: user.id, role: user.role || 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        username: user.username,
        email: user.email,
        role: user.role || 'student',
        balance: user.balance || 0,
        streak_count: newStreak // ??
      }
    });


  } catch (err) {
    console.error('? Критическая ошибка авторизации в PG:', err.message);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера при входе.' });
  }
});



// 3. ПОЛУЧЕНИЕ ПРОФИЛЯ (ФИКС ДЛЯ АВТО-ВХОДА)
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, balance, streak_count FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден.' });
    }

    // Возвращаем строго первую строку (объект), а не массив строк
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('? Ошибка авто-входа:', err.message);
    return res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});


// 4. ПОЛУЧЕНИЕ СПИСКА КУРСОВ, СГРУППИРОВАННЫХ ПО КАТЕГОРИЯМ
app.get('/api/courses', async (req, res) => {
  try {
    // Делаем JOIN таблиц, чтобы вытащить курсы вместе с их категориями
    const queryText = `
      SELECT 
        c.id AS category_id, 
        c.title AS category_title, 
        c.color AS category_color,
        co.id AS course_id, 
        co.title AS course_title, 
        co.description, 
        co.icon_name, 
        co.color AS course_color, 
        co.subject_key
      FROM categories c
      LEFT JOIN courses co ON c.id = co.category_id
      ORDER BY c.id ASC, co.id ASC
    `;

    const result = await pool.query(queryText);

    // Формируем чистую структуру для фронтенда
    const categoriesMap = {};

    result.rows.forEach(row => {
      if (!categoriesMap[row.category_id]) {
        categoriesMap[row.category_id] = {
          id: row.category_id,
          title: row.category_title,
          color: row.category_color,
          subjects: []
        };
      }

      // Если у категории есть курс, добавляем его в массив subjects
      if (row.course_id) {
        categoriesMap[row.category_id].subjects.push({
          id: row.course_id,
          title: row.course_title,
          description: row.description,
          icon_name: row.icon_name,
          color: row.course_color,
          subject_key: row.subject_key
        });
      }
    });

    // Превращаем объект обратно в чистый массив категорий
    const formattedCategories = Object.values(categoriesMap);

    res.json({ success: true, categories: formattedCategories });
  } catch (err) {
    console.error('? Ошибка при загрузке сгруппированных курсов:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке каталога курсов' });
  }
});


// 5. СОХРАНЕНИЕ ПРОГРЕССА СТУДЕНТА (ЗАЩИТА ОТ НАКРУТКИ МОНЕТ)
app.post('/api/progress', authMiddleware, async (req, res) => {
  const { topic_id } = req.body;
  if (!topic_id) return res.status(400).json({ success: false, error: 'Не указан ID темы.' });

  try {
    // Проверяем, есть ли уже такая запись
    const checkProgress = await pool.query(
      'SELECT id FROM progress WHERE user_id = $1 AND topic_id = $2',
      [req.user.id, topic_id]
    );

    if (checkProgress.rows.length > 0) {
      return res.json({ success: true, message: 'Тема уже была пройдена ранее.' });
    }

    // Если темы нет, сохраняем и начисляем монеты
    await pool.query('BEGIN');
    await pool.query(
      'INSERT INTO progress (user_id, topic_id) VALUES ($1, $2)',
      [req.user.id, topic_id]
    );
    await pool.query('UPDATE users SET balance = balance + 50 WHERE id = $1', [req.user.id]);
    await pool.query('COMMIT');

    res.json({ success: true, reward: 50 });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Ошибка прогресса:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сохранения прогресса' });
  }
});


// 6. ПОЛУЧЕНИЕ ПРОГРЕССА ДЛЯ СИНХРОНИЗАЦИИ С SQLITE
app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT topic_id FROM progress WHERE user_id = $1',
      [req.user.id]
    );
    // Отдаем массив чистых ID: [1, 5, 12]
    res.json({ success: true, completed: result.rows.map(row => row.topic_id) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка получения прогресса' });
  }
});


// 7. ПОЛУЧЕНИЕ ГЛОССАРИЯ (С ФИЛЬТРАЦИЕЙ ПО ПРЕДМЕТУ ИЛИ БЕЗ)
app.get('/api/glossary', async (req, res) => {
  const { subject } = req.query; // Получаем ?subject=Math из URL если есть
  try {
    let result;
    if (subject) {
      result = await pool.query('SELECT * FROM glossary WHERE subject_key = $1 ORDER BY term ASC', [subject]);
    } else {
      result = await pool.query('SELECT * FROM glossary ORDER BY term ASC');
    }
    res.json({ success: true, glossary: result.rows });
  } catch (err) {
    console.error('? Ошибка загрузки глоссария из PG:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке глоссария' });
  }
});

// DELETE ACCOUNT (HYBRID: ENGLISH LOGS + RUSSIAN RESPONSES)
app.post('/api/user-delete-account', authMiddleware, async (req, res) => {
  console.log('\n--- [BACKEND: DELETE ACCOUNT STARTED] ---');

  const { password } = req.body;
  const userId = req.user?.id; // Извлекаем ID из токена через middleware

  if (!userId) {
    console.log('? Error: userId is missing in token');
    return res.status(401).json({ success: false, error: 'Пользователь не авторизован.' });
  }

  if (!password) {
    console.log('? Error: Password is empty in req.body');
    return res.status(400).json({ success: false, error: 'Пожалуйста, введите текущий пароль.' });
  }

  try {
    console.log(`?? Searching for user ID: ${userId} in PostgreSQL...`);
    
    // Используем pool.query и ищем строго по идентификатору id
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      console.log('? Error: User not found in database.');
      return res.status(404).json({ success: false, error: 'Пользователь не найден.' });
    }

    const currentUser = userResult.rows[0];
    console.log(`? User found: ${currentUser.username || 'No Name'} (${currentUser.email})`);

    console.log('?? Verifying password hash via bcrypt...');
    // Проверяем поле хэша пароля (поддерживаем оба варианта именования колонки в БД)
    const isMatch = await bcrypt.compare(password, currentUser.password_hash || currentUser.password);
    if (!isMatch) {
      console.log('? Error: Provided password does not match.');
      return res.status(400).json({ success: false, error: 'Неверный пароль.' });
    }

    console.log('?? [Transaction]: Opening SQL transaction...');
    await pool.query('BEGIN');

    try {
      console.log('??? Deleting user progress from "user_progress" table...');
      // Каскадно удаляем прогресс из таблицы user_progress по внешнему ключу
      await pool.query('DELETE FROM progress WHERE user_id = $1', [userId]);

      console.log('??? Deleting user record from "users" table...');
      // Удаляем саму учетную запись
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);

      await pool.query('COMMIT');
      console.log(`?? [SUCCESS]: User ID ${userId} deleted successfully.`);
      console.log('-----------------------------------------\n');
      return res.json({ success: true });

    } catch (dbError) {
      await pool.query('ROLLBACK');
      console.error('? [DATABASE TRANSACTION FAILED]:', dbError.message);
      return res.status(500).json({ success: false, error: 'Ошибка базы данных при удалении.' });
    }

  } catch (err) {
    console.error('?? [CRITICAL ROUTE ERROR]:', err.message);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера.' });
  }
});



// ==========================================
// АДМИНКА 2.0 & RBAC (НОВЫЕ ЭНДПОИНТЫ)
// ==========================================

// Эндпоинт статистики для экрана AdminDashboard.js
app.get('/api/admin/dashboard-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const coursesCount = await pool.query('SELECT COUNT(*) FROM courses');

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(usersCount.rows[0].count),
        totalCourses: parseInt(coursesCount.rows[0].count)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сбора статистики' });
  }
});

// Создание нового курса (с пошаговой валидацией)
app.post('/api/admin/courses', authMiddleware, adminMiddleware, async (req, res) => {
  const { title, description, category_id, icon_name, color } = req.body;

  // Жесткая серверная проверка входящих данных
  if (!title || title.trim().length < 3) {
    return res.status(400).json({ success: false, error: 'Название курса должно содержать от 3 символов.' });
  }
  if (!description || description.trim().length > 500) {
    return res.status(400).json({ success: false, error: 'Описание обязательно (до 500 символов).' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO courses (title, description, category_id, icon_name, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title.trim(), description.trim(), category_id, icon_name || 'book', color || '#4A90E2']
    );

    console.log(`[?? Админка]: Администратор ${req.user.id} создал курс "${title}"`);
    res.status(201).json({ success: true, course: result.rows[0] });
  } catch (err) {
    console.error('? Ошибка создания курса в PG:', err.message);
    res.status(500).json({ success: false, error: 'Не удалось сохранить курс в базу данных.' });
  }
});

// Полное удаление курса из PostgreSQL
app.delete('/api/admin/courses/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const courseId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING id', [courseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Данный курс не найден в базе.' });
    }

    console.log(`[?? Админка]: Курс ID ${courseId} успешно удален.`);
    res.json({ success: true, message: `Курс успешно удален.` });
  } catch (err) {
    console.error('? Ошибка удаления курса:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера при удалении записи.' });
  }
});

// ПОЛУЧЕНИЕ ВСЕХ ТЕМ ДЛЯ СИНХРОНИЗАЦИИ (БЕЗОПАСНЫЙ ВАРИАНТ)
app.get('/api/topics', async (req, res) => {
  try {
    // ?? ИСПРАВЛЕНО: Сортируем просто по id, чтобы база данных не ругалась на отсутствие sort_order
    const result = await pool.query('SELECT * FROM topics ORDER BY id ASC');
    res.json({ success: true, topics: result.rows });
  } catch (err) {
    console.error('? Ошибка при загрузке списка тем:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера при загрузке тем' });
  }
});

// ==========================================
// ?? WAVE-SHOP (МАГАЗИН ЗА МОНЕТЫ)
// ==========================================

app.post('/api/shop/buy', authMiddleware, async (req, res) => {
  const { item_type, item_value, price } = req.body;
  const userId = req.user.id;

  if (!item_type || !item_value || !price) {
    return res.status(400).json({ success: false, error: 'Неполные данные о товаре.' });
  }

  try {
    // 1. Проверяем текущий баланс пользователя
    const userCheck = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден.' });
    }

    const currentBalance = userCheck.rows[0].balance || 0;

    // 2. Проверяем, хватает ли монет
    if (currentBalance < price) {
      return res.status(400).json({ success: false, error: 'Недостаточно монет для покупки! Учите темы активнее. ??' });
    }

    // 3. Если товар — косметическая рамка, проверяем, не куплена ли она уже
    if (item_type === 'frame') {
      const frameCheck = await pool.query(
        'SELECT id FROM user_inventory WHERE user_id = $1 AND item_type = $2 AND item_value = $3',
        [userId, item_type, item_value]
      );
      if (frameCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Эта рамка уже куплена и доступна в профиле!' });
      }
    }

    // 4. Открываем транзакцию для безопасного списания баланса
    await pool.query('BEGIN');

    // Списываем монеты
    await pool.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [price, userId]);

    // Добавляем вещь в инвентарь
    await pool.query(
      'INSERT INTO user_inventory (user_id, item_type, item_value) VALUES ($1, $2, $3)',
      [userId, item_type, item_value]
    );

    await pool.query('COMMIT');

    // Рассчитываем новый баланс для возврата на фронтенд
    const newBalance = currentBalance - price;

    console.log(`?? [Shop]: Пользователь ID ${userId} купил ${item_value} за ${price} монет.`);
    res.json({ success: true, newBalance, message: 'Покупка успешно совершена!' });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('? Ошибка транзакции магазина:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера при обработке покупки.' });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('-------------------------------------------');
  console.log(`?? LearnWave Server started on port ${PORT}`);
  console.log(`?? Local URL:   http://localhost:${PORT}`);
  console.log(`?? Network URL: http://192.168.1.38:${PORT}`);
  console.log('?? Security:   RBAC role model is active');
  console.log('-------------------------------------------');
});

