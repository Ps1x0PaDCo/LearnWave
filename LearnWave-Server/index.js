const express       = require('express');
const cors          = require('cors');
const { Pool }      = require('pg');
const bcrypt        = require('bcryptjs');
const jwt           = require('jsonwebtoken');
const passwordReset = require('./passwordReset');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Yekaterinburg';
const getDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

// UTF-8 РґР»СЏ РІСЃРµС… РѕС‚РІРµС‚РѕРІ
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Р›РѕРіРіРµСЂ Р·Р°РїСЂРѕСЃРѕРІ
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// в”Ђв”Ђв”Ђ PostgreSQL в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     process.env.DB_PORT || 5432,
});

pool.connect((err) => {
  if (err) console.error('вќЊ PostgreSQL connection error:', err.stack);
  else {
    console.log('вњ… PostgreSQL connected');
    pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        color VARCHAR(50)
      );
      INSERT INTO categories (id, title, color)
      VALUES (6, 'Прочие', '#64748B')
      ON CONFLICT (id) DO UPDATE
      SET title = EXCLUDED.title, color = EXCLUDED.color;
    `).catch(e => console.error('Category misc seed error:', e.message));
    pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;')
      .catch(e => console.error('Username uniqueness migration error:', e.message));
    pool.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;')
      .catch(e => console.error('вќЊ Course publish column error:', e.message));
    pool.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_type TEXT NOT NULL,
        item_value TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, item_type, item_value)
      );
    `).catch(e => console.error('Inventory table error:', e.message));
    pool.query('ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;')
      .catch(e => console.error('Inventory quantity column error:', e.message));
    pool.query(`
      WITH hint_totals AS (
        SELECT
          user_id,
          SUM(CASE WHEN item_value = 'hint_x3' THEN COALESCE(quantity, 1) * 3 ELSE COALESCE(quantity, 1) END)::int AS total_quantity
        FROM user_inventory
        WHERE item_type = 'quiz_hint'
        GROUP BY user_id
      ),
      deleted AS (
        DELETE FROM user_inventory WHERE item_type = 'quiz_hint'
      )
      INSERT INTO user_inventory (user_id, item_type, item_value, quantity)
      SELECT user_id, 'quiz_hint', 'hint_5050', total_quantity
      FROM hint_totals
      WHERE total_quantity > 0
      ON CONFLICT (user_id, item_type, item_value)
      DO UPDATE SET quantity = user_inventory.quantity + EXCLUDED.quantity;
    `).catch(e => console.error('Inventory hint migration error:', e.message));
    pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_inventory_unique_item
      ON user_inventory (user_id, item_type, item_value);
    `).catch(e => console.error('Inventory unique index error:', e.message));
    // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј РјРѕРґСѓР»СЊ СЃР±СЂРѕСЃР° РїР°СЂРѕР»СЏ
    passwordReset.init(pool);
    passwordReset.createTable();
  }
});

// Р РѕСѓС‚С‹ СЃР±СЂРѕСЃР° РїР°СЂРѕР»СЏ
app.use('/api/auth', passwordReset.router);

// в”Ђв”Ђв”Ђ Middlewares в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Токен не предоставлен.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Токен недействителен.' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    console.warn(`в›” Unauthorized admin access attempt. User ID: ${req.user?.id}`);
    return res.status(403).json({ success: false, error: 'Доступ запрещён.' });
  }
  next();
};

// в”Ђв”Ђв”Ђ AUTH в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

// Р РµРіРёСЃС‚СЂР°С†РёСЏ
app.post('/api/register', async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password)
    return res.status(400).json({ success: false, error: 'Все поля обязательны.' });

  const normalizedEmail    = email.toLowerCase().trim();
  const normalizedUsername = username.trim();

  // РЎРїРёСЃРѕРє СЃСѓРїРµСЂР°РґРјРёРЅРѕРІ РёР· РїРµСЂРµРјРµРЅРЅРѕР№ РѕРєСЂСѓР¶РµРЅРёСЏ
  const superAdmins = (process.env.SUPER_ADMINS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const role = superAdmins.includes(normalizedEmail) ? 'admin' : 'student';

  try {
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (emailCheck.rows.length > 0)
      return res.status(400).json({ success: false, error: 'Email уже занят.' });
    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (email, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role',
      [normalizedEmail, normalizedUsername, hashed, role]
    );
    console.log(`[вњ… Register] ${normalizedUsername} (${normalizedEmail})`);
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('вќЊ Register error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// Р’С…РѕРґ
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, error: 'Все поля обязательны.' });

  try {
    const result = await pool.query(
      'SELECT *, last_login::text AS last_login_key FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0)
      return res.status(400).json({ success: false, error: 'Пользователь с таким email не найден.' });

    const user    = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, error: 'Неверный пароль.' });

    // Streak
    let newStreak = user.streak_count || 0;
    const today   = getDateKey();
    let freezeUsed = false;
    let freezeDaysLeft = 0;
    if (user.last_login) {
      const last    = user.last_login_key || getDateKey(user.last_login);
      const diffMs  = Math.abs(new Date(`${today}T00:00:00Z`) - new Date(`${last}T00:00:00Z`));
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (last !== today) {
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays === 2) {
          const freezeResult = await pool.query(
            `UPDATE user_inventory
             SET quantity = quantity - 1
             WHERE id = (
               SELECT id
               FROM user_inventory
               WHERE user_id = $1
                 AND item_type = 'streak_freeze'
                 AND item_value = 'freeze_day'
                 AND quantity > 0
               ORDER BY id ASC
               LIMIT 1
             )
             RETURNING quantity`,
            [user.id]
          );
          if (freezeResult.rows.length > 0) {
            freezeUsed = true;
            freezeDaysLeft = Math.max(freezeResult.rows[0].quantity || 0, 0);
            await pool.query("DELETE FROM user_inventory WHERE user_id = $1 AND item_type = 'streak_freeze' AND item_value = 'freeze_day' AND quantity <= 0", [user.id]);
          } else {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
      }
    } else {
      newStreak = 1;
    }
    await pool.query(
      'UPDATE users SET streak_count = $1, last_login = $2 WHERE id = $3',
      [newStreak, today, user.id]
    );

    const token = jwt.sign(
      { id: user.id, role: user.role || 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id:           user.id,
        username:     user.username,
        email:        user.email,
        role:         user.role || 'student',
        balance:      user.balance || 0,
        streak_count: newStreak,
        freeze_used:  freezeUsed,
        freeze_days_left: freezeDaysLeft,
      }
    });
  } catch (err) {
    console.error('вќЊ Login error:', err.message);
    return res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// РџСЂРѕС„РёР»СЊ
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, balance, streak_count FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, error: 'Пользователь не найден.' });
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('вќЊ Profile error:', err.message);
    return res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

app.patch('/api/profile/name', authMiddleware, async (req, res) => {
  const username = String(req.body?.username || '').trim();
  if (username.length < 3) {
    return res.status(400).json({ success: false, error: 'Имя должно быть не короче 3 символов.' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email, role, balance, streak_count',
      [username, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден.' });
    }
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Update profile name error:', err.message);
    return res.status(500).json({ success: false, error: 'Не удалось обновить имя.' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, balance, streak_count
      FROM users
      ORDER BY balance DESC, streak_count DESC, id ASC
      LIMIT 50
    `);
    res.json({ success: true, leaders: result.rows });
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// РЎР±СЂРѕСЃ РїР°СЂРѕР»СЏ вЂ” СЂРµР°Р»РёР·РѕРІР°РЅ РІ passwordReset.js (РїРѕРґРєР»СЋС‡С‘РЅ РІС‹С€Рµ С‡РµСЂРµР· app.use)

// в”Ђв”Ђв”Ђ РљРЈР РЎР« в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
app.get('/api/courses', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id   AS category_id,
        c.title AS category_title,
        c.color AS category_color,
        co.id          AS course_id,
        co.title       AS course_title,
        co.description,
        co.icon_name,
        co.color       AS course_color,
        co.subject_key,
        COALESCE(co.is_published, true) AS is_published,
        COUNT(t.id)::int AS topic_count
      FROM categories c
      LEFT JOIN courses co ON c.id = co.category_id AND COALESCE(co.is_published, true) = true
      LEFT JOIN topics t ON t.course_id = co.id OR t.subject_key = co.subject_key
      GROUP BY c.id, c.title, c.color, co.id, co.title, co.description, co.icon_name, co.color, co.subject_key, co.is_published
      ORDER BY c.id ASC, co.id ASC
    `);

    const map = {};
    result.rows.forEach(row => {
      if (!map[row.category_id]) {
        map[row.category_id] = { id: row.category_id, title: row.category_title, color: row.category_color, subjects: [] };
      }
      if (row.course_id) {
        map[row.category_id].subjects.push({
          id:          row.course_id,
          title:       row.course_title,
          description: row.description,
          icon_name:   row.icon_name,
          color:       row.course_color,
          subject_key: row.subject_key,
          is_published: row.is_published,
          topic_count: row.topic_count || 0,
        });
      }
    });

    res.json({ success: true, categories: Object.values(map) });
  } catch (err) {
    console.error('вќЊ Courses error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// в”Ђв”Ђв”Ђ РўР•РњР« в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
app.get('/api/topics', async (req, res) => {
  try {
    const { subject_key } = req.query;
    let result;
    if (subject_key) {
      result = await pool.query('SELECT * FROM topics WHERE subject_key = $1 ORDER BY id ASC', [subject_key]);
    } else {
      result = await pool.query('SELECT * FROM topics ORDER BY id ASC');
    }
    res.json({ success: true, topics: result.rows });
  } catch (err) {
    console.error('вќЊ Topics error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// РРЎРџР РђР’Р›Р•РќРћ: РґРѕР±Р°РІР»РµРЅ POST /api/topics вЂ” РЅСѓР¶РµРЅ AdminPanel РґР»СЏ Р·Р°РіСЂСѓР·РєРё Р»РµРєС†РёР№
app.post('/api/topics', authMiddleware, adminMiddleware, async (req, res) => {
  const { title, course_id, subject_key, content, description, quiz_question, quiz_answer, difficulty } = req.body;
  if (!title || !subject_key || !content)
    return res.status(400).json({ success: false, error: 'Название, ключ и содержимое обязательны.' });
  try {
    const result = await pool.query(
      `INSERT INTO topics (title, course_id, subject_key, content, description, quiz_question, quiz_answer, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title.trim(), course_id || null, subject_key, content, description || '', quiz_question || '', quiz_answer || '', difficulty || 1]
    );
    console.log(`[вњ… Topic created] "${title}" by admin ID ${req.user.id}`);
    res.status(201).json({ success: true, topic: result.rows[0] });
  } catch (err) {
    console.error('вќЊ Create topic error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

app.put('/api/admin/topics/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const topicId = req.params.id;
  const { title, content, description, quiz_question, quiz_answer, difficulty } = req.body;
  if (!title || title.trim().length < 3)
    return res.status(400).json({ success: false, error: 'Название темы слишком короткое.' });
  if (!content || content.trim().length < 20)
    return res.status(400).json({ success: false, error: 'Материал темы слишком короткий.' });

  try {
    const result = await pool.query(
      `UPDATE topics
       SET title = $1, content = $2, description = $3, quiz_question = $4, quiz_answer = $5, difficulty = $6
       WHERE id = $7
       RETURNING *`,
      [title.trim(), content.trim(), description || '', quiz_question || '', quiz_answer || '', difficulty || 1, topicId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, error: 'Тема не найдена.' });
    res.json({ success: true, topic: result.rows[0] });
  } catch (err) {
    console.error('вќЊ Update topic error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// в”Ђв”Ђв”Ђ РџР РћР“Р Р•РЎРЎ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
app.delete('/api/admin/topics/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const topicId = req.params.id;
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM progress WHERE topic_id = $1', [topicId]);
    const result = await pool.query('DELETE FROM topics WHERE id = $1 RETURNING id, title', [topicId]);
    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Тема не найдена.' });
    }
    await pool.query('COMMIT');
    res.json({ success: true, topic: result.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Delete topic error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});
app.post('/api/progress', authMiddleware, async (req, res) => {
  const { topic_id } = req.body;
  if (!topic_id) return res.status(400).json({ success: false, error: 'Не передан topic_id.' });
  try {
    const check = await pool.query(
      'SELECT id FROM progress WHERE user_id = $1 AND topic_id = $2',
      [req.user.id, topic_id]
    );
    if (check.rows.length > 0)
      return res.json({ success: true, message: 'Уже пройдено.' });

    await pool.query('BEGIN');
    await pool.query('INSERT INTO progress (user_id, topic_id) VALUES ($1, $2)', [req.user.id, topic_id]);
    await pool.query('UPDATE users SET balance = balance + 50 WHERE id = $1', [req.user.id]);
    await pool.query('COMMIT');
    res.json({ success: true, reward: 50 });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('вќЊ Progress error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.topic_id, t.subject_key
      FROM progress p
      LEFT JOIN topics t ON t.id = p.topic_id
      WHERE p.user_id = $1
      ORDER BY p.topic_id ASC
    `, [req.user.id]);
    res.json({ success: true, completed: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// в”Ђв”Ђв”Ђ Р“Р›РћРЎРЎРђР РР™ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
app.get('/api/glossary', async (req, res) => {
  const { subject } = req.query;
  try {
    const result = subject
      ? await pool.query('SELECT * FROM glossary WHERE subject_key = $1 ORDER BY term ASC', [subject])
      : await pool.query('SELECT * FROM glossary ORDER BY term ASC');
    res.json({ success: true, glossary: result.rows });
  } catch (err) {
    console.error('вќЊ Glossary error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// в”Ђв”Ђв”Ђ Р‘РђР›РђРќРЎ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// РРЎРџР РђР’Р›Р•РќРћ: РґРѕР±Р°РІР»РµРЅ СЌРЅРґРїРѕРёРЅС‚ РґР»СЏ РїРѕРєСѓРїРѕРє РІ ShopScreen Рё ProfileScreen
app.post('/api/user/update-balance', authMiddleware, async (req, res) => {
  const { balance } = req.body;
  if (balance === undefined || balance < 0)
    return res.status(400).json({ success: false, error: 'Некорректный баланс.' });
  try {
    await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [balance, req.user.id]);
    res.json({ success: true, balance });
  } catch (err) {
    console.error('вќЊ Balance update error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// в”Ђв”Ђв”Ђ РњРђР“РђР—РРќ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
app.post('/api/shop/buy', authMiddleware, async (req, res) => {
  const { item_type, item_value, price } = req.body;
  const userId = req.user.id;
  if (!item_type || !item_value || !price)
    return res.status(400).json({ success: false, error: 'Неполные данные.' });
  try {
    const userCheck = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0)
      return res.status(404).json({ success: false, error: 'Пользователь не найден.' });

    const currentBalance = userCheck.rows[0].balance || 0;
    if (currentBalance < price)
      return res.status(400).json({ success: false, error: 'Недостаточно монет.' });

    const normalizedItemValue = item_type === 'quiz_hint' ? 'hint_5050'
      : item_type === 'streak_freeze' ? 'freeze_day'
      : item_value;
    const quantityToAdd = item_type === 'quiz_hint' && item_value === 'hint_x3' ? 3 : 1;

    if (item_type === 'frame') {
      const frameCheck = await pool.query(
        'SELECT id FROM user_inventory WHERE user_id = $1 AND item_type = $2 AND item_value = $3',
        [userId, item_type, normalizedItemValue]
      );
      if (frameCheck.rows.length > 0)
        return res.status(400).json({ success: false, error: 'Уже куплено.' });
    }

    await pool.query('BEGIN');
    await pool.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [price, userId]);
    if (item_type === 'frame') {
      await pool.query(
        'INSERT INTO user_inventory (user_id, item_type, item_value, quantity) VALUES ($1, $2, $3, 1)',
        [userId, item_type, normalizedItemValue]
      );
    } else {
      await pool.query(
        `INSERT INTO user_inventory (user_id, item_type, item_value, quantity)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, item_type, item_value)
         DO UPDATE SET quantity = user_inventory.quantity + EXCLUDED.quantity`,
        [userId, item_type, normalizedItemValue, quantityToAdd]
      );
    }
    await pool.query('COMMIT');

    const newBalance = currentBalance - price;
    console.log(`рџ’° [Shop] User ${userId} bought ${item_value} for ${price} coins.`);
    res.json({ success: true, newBalance, item_value: normalizedItemValue, quantityAdded: quantityToAdd, message: 'Покупка успешна.' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('вќЊ Shop error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// в”Ђв”Ђв”Ђ РЈР”РђР›Р•РќРР• РђРљРљРђРЈРќРўРђ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
app.get('/api/shop/inventory', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT item_type, item_value, quantity FROM user_inventory WHERE user_id = $1 ORDER BY id ASC',
      [req.user.id]
    );
    res.json({ success: true, items: result.rows });
  } catch (err) {
    console.error('Inventory error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

app.post('/api/shop/use-item', authMiddleware, async (req, res) => {
  const { item_type, item_value } = req.body;
  const normalizedItemValue = item_type === 'quiz_hint' ? 'hint_5050'
    : item_type === 'streak_freeze' ? 'freeze_day'
    : item_value;
  if (!item_type || !normalizedItemValue)
    return res.status(400).json({ success: false, error: 'Неполные данные.' });

  try {
    await pool.query('BEGIN');
    const item = await pool.query(
      'SELECT id, quantity FROM user_inventory WHERE user_id = $1 AND item_type = $2 AND item_value = $3 FOR UPDATE',
      [req.user.id, item_type, normalizedItemValue]
    );
    if (item.rows.length === 0 || (item.rows[0].quantity || 0) <= 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Предмет недоступен.' });
    }
    const nextQuantity = (item.rows[0].quantity || 0) - 1;
    if (nextQuantity > 0) {
      await pool.query('UPDATE user_inventory SET quantity = $1 WHERE id = $2', [nextQuantity, item.rows[0].id]);
    } else {
      await pool.query('DELETE FROM user_inventory WHERE id = $1', [item.rows[0].id]);
    }
    await pool.query('COMMIT');
    res.json({ success: true, item_value: normalizedItemValue, quantity: nextQuantity });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Use item error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});
app.post('/api/user-delete-account', authMiddleware, async (req, res) => {
  const { password } = req.body;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Нет авторизации.' });
  if (!password) return res.status(400).json({ success: false, error: 'Нужен пароль.' });
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0)
      return res.status(404).json({ success: false, error: 'Пользователь не найден.' });

    const user    = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash || user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, error: 'Неверный пароль.' });

    await pool.query('BEGIN');
    await pool.query('DELETE FROM progress WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('COMMIT');

    console.log(`вњ… User ID ${userId} deleted.`);
    return res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('вќЊ Delete account error:', err.message);
    return res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// в”Ђв”Ђв”Ђ ADMIN в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

// РРЎРџР РђР’Р›Р•РќРћ: РґРѕР±Р°РІР»РµРЅ Р°Р»РёР°СЃ /api/admin/stats (РєР»РёРµРЅС‚ Р·РѕРІС‘С‚ РµРіРѕ, Р° РЅРµ /dashboard-stats)
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const usersCount   = await pool.query('SELECT COUNT(*) FROM users');
    const coursesCount = await pool.query('SELECT COUNT(*) FROM courses');
    const topicsCount  = await pool.query('SELECT COUNT(*) FROM topics');
    res.json({
      success: true,
      stats: {
        totalUsers:   parseInt(usersCount.rows[0].count),
        totalCourses: parseInt(coursesCount.rows[0].count),
        totalTopics:  parseInt(topicsCount.rows[0].count),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// РђР»РёР°СЃ РґР»СЏ РѕР±СЂР°С‚РЅРѕР№ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚Рё
app.get('/api/admin/dashboard-stats', authMiddleware, adminMiddleware, async (req, res) => {
  return res.redirect(307, '/api/admin/stats');
});

app.get('/api/admin/courses', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        co.id,
        co.title,
        co.description,
        co.category_id,
        co.icon_name,
        co.color,
        co.subject_key,
        COALESCE(co.is_published, true) AS is_published,
        COUNT(t.id)::int AS topic_count
      FROM courses co
      LEFT JOIN topics t ON t.course_id = co.id OR t.subject_key = co.subject_key
      GROUP BY co.id, co.title, co.description, co.category_id, co.icon_name, co.color, co.subject_key, co.is_published
      ORDER BY co.category_id ASC, co.id ASC
    `);
    res.json({ success: true, courses: result.rows });
  } catch (err) {
    console.error('вќЊ Admin courses error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// РРЎРџР РђР’Р›Р•РќРћ: РґРѕР±Р°РІР»РµРЅ GET /api/admin/users вЂ” РЅСѓР¶РµРЅ AdminPanel РґР»СЏ СЃРїРёСЃРєР° РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, balance, streak_count FROM users ORDER BY role DESC, username ASC'
    );
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error('вќЊ Admin users error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// РРЎРџР РђР’Р›Р•РќРћ: РґРѕР±Р°РІР»РµРЅ GET /api/progress?username= вЂ” РЅСѓР¶РµРЅ AdminPanel РґР»СЏ СЃС‚Р°С‚РёСЃС‚РёРєРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
app.get('/api/admin/user-progress', authMiddleware, adminMiddleware, async (req, res) => {
  const { id, email, username } = req.query;
  if (!id && !email && !username) return res.status(400).json({ success: false, error: 'Нет идентификатора пользователя.' });
  try {
    const userResult = id
      ? await pool.query('SELECT id FROM users WHERE id = $1', [id])
      : email
        ? await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email])
        : await pool.query('SELECT id FROM users WHERE username = $1 ORDER BY id ASC LIMIT 1', [username]);
    if (userResult.rows.length === 0)
      return res.status(404).json({ success: false, error: 'Пользователь не найден.' });

    const userId = userResult.rows[0].id;
    const result = await pool.query(`
      SELECT
        p.topic_id,
        t.title AS topic_title,
        t.subject_key,
        c.title AS course_title
      FROM progress p
      LEFT JOIN topics t ON t.id = p.topic_id
      LEFT JOIN courses c ON c.id = t.course_id OR c.subject_key = t.subject_key
      WHERE p.user_id = $1
      ORDER BY p.topic_id ASC
    `, [userId]);
    res.json({ success: true, progress: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

app.post('/api/admin/courses', authMiddleware, adminMiddleware, async (req, res) => {
  const { title, description, category_id, icon_name, color, subject_key, is_published } = req.body;
  const normalizedTitle = title?.trim() || '';
  const normalizedDescription = description?.trim() || '';
  const normalizedKey = (subject_key || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!title || title.trim().length < 3)
    return res.status(400).json({ success: false, error: 'Название слишком короткое.' });
  if (normalizedDescription.length < 10)
    return res.status(400).json({ success: false, error: 'Добавьте описание курса.' });
  if (normalizedKey.length < 3)
    return res.status(400).json({ success: false, error: 'Ключ курса слишком короткий.' });
  try {
    const duplicate = await pool.query(
      'SELECT id FROM courses WHERE LOWER(title) = LOWER($1) OR subject_key = $2 LIMIT 1',
      [normalizedTitle, normalizedKey]
    );
    if (duplicate.rows.length > 0)
      return res.status(400).json({ success: false, error: 'Курс с таким названием или ключом уже есть.' });

    const result = await pool.query(
      'INSERT INTO courses (title, description, category_id, icon_name, color, subject_key, is_published) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [normalizedTitle, normalizedDescription, category_id || 1, icon_name || 'book', color || '#4A90E2', normalizedKey, is_published === true]
    );
    console.log(`[вњ… Course created] "${title}" by admin ID ${req.user.id}`);
    res.status(201).json({ success: true, course: result.rows[0] });
  } catch (err) {
    console.error('вќЊ Create course error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

app.put('/api/admin/courses/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const courseId = req.params.id;
  const { title, description, category_id, icon_name, color, subject_key, is_published } = req.body;
  const normalizedTitle = title?.trim() || '';
  const normalizedDescription = description?.trim() || '';
  const normalizedKey = (subject_key || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (normalizedTitle.length < 3)
    return res.status(400).json({ success: false, error: 'Название слишком короткое.' });
  if (normalizedDescription.length < 10)
    return res.status(400).json({ success: false, error: 'Добавьте описание курса.' });
  if (normalizedKey.length < 3)
    return res.status(400).json({ success: false, error: 'Ключ курса слишком короткий.' });

  try {
    const duplicate = await pool.query(
      'SELECT id FROM courses WHERE id <> $1 AND (LOWER(title) = LOWER($2) OR subject_key = $3) LIMIT 1',
      [courseId, normalizedTitle, normalizedKey]
    );
    if (duplicate.rows.length > 0)
      return res.status(400).json({ success: false, error: 'Курс с таким названием или ключом уже есть.' });

    await pool.query('BEGIN');
    const oldCourse = await pool.query('SELECT subject_key FROM courses WHERE id = $1', [courseId]);
    if (oldCourse.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Курс не найден.' });
    }

    const result = await pool.query(
      `UPDATE courses
       SET title = $1, description = $2, category_id = $3, icon_name = $4, color = $5, subject_key = $6, is_published = $7
       WHERE id = $8
       RETURNING *`,
      [normalizedTitle, normalizedDescription, category_id || 1, icon_name || 'book', color || '#4A90E2', normalizedKey, is_published === true, courseId]
    );

    if (oldCourse.rows[0].subject_key !== normalizedKey) {
      await pool.query('UPDATE topics SET subject_key = $1 WHERE subject_key = $2 OR course_id = $3', [normalizedKey, oldCourse.rows[0].subject_key, courseId]);
    }

    await pool.query('COMMIT');
    res.json({ success: true, course: result.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('вќЊ Update course error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

app.patch('/api/admin/courses/:id/publish', authMiddleware, adminMiddleware, async (req, res) => {
  const courseId = req.params.id;
  const isPublished = req.body.is_published === true;
  try {
    const result = await pool.query(
      'UPDATE courses SET is_published = $1 WHERE id = $2 RETURNING *',
      [isPublished, courseId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, error: 'Курс не найден.' });
    res.json({ success: true, course: result.rows[0] });
  } catch (err) {
    console.error('вќЊ Publish course error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

app.delete('/api/admin/courses/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const courseId = req.params.id;
  try {
    await pool.query('BEGIN');
    const courseResult = await pool.query('SELECT subject_key FROM courses WHERE id = $1', [courseId]);
    if (courseResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Курс не найден.' });
    }
    await pool.query(
      'DELETE FROM topics WHERE course_id = $1 OR subject_key = $2',
      [courseId, courseResult.rows[0].subject_key]
    );
    const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING id', [courseId]);
    await pool.query('COMMIT');
    console.log(`[вњ… Course deleted] ID ${courseId}`);
    res.json({ success: true, message: 'Курс удалён.' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('вќЊ Delete course error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// в”Ђв”Ђв”Ђ Р—Р°РїСѓСЃРє в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('-------------------------------------------');
  console.log(`рџљЂ LearnWave Server started on port ${PORT}`);
  console.log(`рџ”— Local:   http://localhost:${PORT}`);
  console.log(`рџ”— Network: check your IP in .env`);
  console.log(`рџ”’ Security: RBAC active`);
  console.log('-------------------------------------------');
});



