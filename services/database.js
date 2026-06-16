import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { db } from './db';

// ─── Список супер-админов через переменную окружения ───────────────────────
// В .env добавь: EXPO_PUBLIC_ADMINS=admin@admin.com,your@email.com
// Fallback: пустой список (никто не получит роль admin автоматически)
const SUPER_ADMINS = (process.env.EXPO_PUBLIC_ADMINS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// ─── Хэширование пароля ───────────────────────────────────────────────────
const hashPassword = async (password) => {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
};

// ─── Декодирование base64 — без Buffer (веб-совместимо) ───────────────────
const decodeBase64Safe = (str) => {
  if (!str) return '';
  try {
    // atob работает в браузере и в React Native (через Hermes)
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return str; // Не base64 — возвращаем как есть
  }
};

const dbInternalService = {
  // ─── Инициализация БД (только на нативе) ────────────────────────────────
  init: async () => {
    if (Platform.OS === 'web') {
      console.log('🌐 [DB] Web mode: SQLite skipped, using server API.');
      return [];
    }
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_id INTEGER UNIQUE,
          email TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'student',
          balance INTEGER DEFAULT 0,
          streak_count INTEGER DEFAULT 0,
          last_login TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS courses (
          id INTEGER PRIMARY KEY,
          server_id INTEGER UNIQUE,
          title TEXT NOT NULL,
          subject_key TEXT NOT NULL UNIQUE,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS topics (
          id INTEGER PRIMARY KEY,
          server_id INTEGER UNIQUE,
          subject_key TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          content TEXT,
          quiz_question TEXT,
          quiz_answer TEXT,
          difficulty INTEGER DEFAULT 1,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          topic_id INTEGER NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(username, topic_id)
        );
        CREATE TABLE IF NOT EXISTS user_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          topic_id INTEGER NOT NULL,
          topic_key TEXT NOT NULL,
          status TEXT DEFAULT 'completed',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(username, topic_id)
        );
        CREATE TABLE IF NOT EXISTS achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          badge_id TEXT NOT NULL,
          date TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(username, badge_id)
        );
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          topic_id INTEGER NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(username, topic_id)
        );
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          topic_id INTEGER NOT NULL,
          content TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS glossary (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          term TEXT NOT NULL UNIQUE,
          definition TEXT NOT NULL,
          subject_key TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Начальные данные — только если таблица пустая
      const count = db.getFirstSync('SELECT COUNT(*) as count FROM topics;');
      if (count?.count === 0) {
        db.runSync(
          `INSERT OR IGNORE INTO courses (title, subject_key) VALUES ('Математика', 'math'), ('IT технологии', 'python_dev');`
        );
        db.runSync(
          `INSERT OR IGNORE INTO topics (subject_key, title, description, content) VALUES
            ('math', 'Основы тригонометрии', 'Синусы и косинусы', '### Введение\nТекст лекции...'),
            ('python_dev', 'Основы Python', 'Первые шаги', '### Hello World\nТекст лекции...');`
        );
      }
      console.log('✅ [DB] SQLite initialized successfully.');
      return [];
    } catch (err) {
      console.error('❌ [DB] Init Error:', err);
      return [];
    }
  },

  // ─── Глоссарий ───────────────────────────────────────────────────────────
  getGlossary: (subject = null) => {
    if (Platform.OS === 'web') return [];
    const query = subject
      ? 'SELECT * FROM glossary WHERE subject_key = ? ORDER BY term ASC'
      : 'SELECT * FROM glossary ORDER BY term ASC';
    return db.getAllSync(query, subject ? [subject] : []);
  },

  saveGlossaryTerm: (term, definition, subjectKey) => {
    if (Platform.OS === 'web') return { success: true };
    try {
      const cleanTerm = decodeBase64Safe(term).trim();
      const cleanDefinition = decodeBase64Safe(definition).trim();
      db.runSync(
        'INSERT OR REPLACE INTO glossary (term, definition, subject_key, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP);',
        [cleanTerm, cleanDefinition, subjectKey.toLowerCase()]
      );
      return { success: true };
    } catch (err) {
      console.error('❌ [DB] Glossary save error:', err);
      return { success: false, error: err.message };
    }
  },

  // ─── Пользователи ────────────────────────────────────────────────────────
  registerUser: async (email, username, password) => {
    if (Platform.OS === 'web') return { success: false, error: 'Используй API на вебе' };
    try {
      const hashed = await hashPassword(password);
      const cleanEmail = email.toLowerCase().trim();
      const role = SUPER_ADMINS.includes(cleanEmail) ? 'admin' : 'student';
      db.runSync(
        'INSERT OR REPLACE INTO users (email, username, password, role, balance, updated_at) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP);',
        [cleanEmail, username.trim(), hashed, role]
      );
      const newUser = db.getFirstSync('SELECT * FROM users WHERE email = ?;', [cleanEmail]);
      return { success: true, user: newUser };
    } catch (err) {
      return { success: false, error: 'Ошибка регистрации' };
    }
  },

  loginUser: async (email, password) => {
    if (Platform.OS === 'web') return { success: false, error: 'Используй API на вебе' };
    try {
      const hashed = await hashPassword(password);
      const cleanEmail = email.toLowerCase().trim();
      const role = SUPER_ADMINS.includes(cleanEmail) ? 'admin' : 'student';
      db.runSync(
        'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?;',
        [role, cleanEmail]
      );
      const user = db.getFirstSync(
        'SELECT * FROM users WHERE email = ? AND password = ?;',
        [cleanEmail, hashed]
      );
      return user ? { success: true, user } : { success: false, error: 'Неверные данные' };
    } catch (err) {
      return { success: false, error: 'Ошибка входа' };
    }
  },

  resetPassword: async (email, newPass) => {
    if (Platform.OS === 'web') return { success: false, error: 'Используй API на вебе' };
    try {
      const hashed = await hashPassword(newPass);
      db.runSync(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?;',
        [hashed, email.toLowerCase().trim()]
      );
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Ошибка БД' };
    }
  },

  updateNickname: async (oldUsername, newUsername) => {
    if (Platform.OS === 'web') return { success: false, error: 'Используй API на вебе' };
    try {
      const trimmedNew = newUsername.trim();
      const now = new Date().toISOString();
      db.runSync('UPDATE users SET username = ?, updated_at = ? WHERE username = ?;', [trimmedNew, now, oldUsername]);
      db.runSync('UPDATE progress SET username = ?, updated_at = ? WHERE username = ?;', [trimmedNew, now, oldUsername]);
      db.runSync('UPDATE user_progress SET username = ?, updated_at = ? WHERE username = ?;', [trimmedNew, now, oldUsername]);
      db.runSync('UPDATE achievements SET username = ?, updated_at = ? WHERE username = ?;', [trimmedNew, now, oldUsername]);
      db.runSync('UPDATE bookmarks SET username = ?, updated_at = ? WHERE username = ?;', [trimmedNew, now, oldUsername]);
      db.runSync('UPDATE notes SET username = ?, updated_at = ? WHERE username = ?;', [trimmedNew, now, oldUsername]);
      return { success: true, newUsername: trimmedNew };
    } catch (err) {
      return { success: false, error: 'Ник занят' };
    }
  },

  // ─── Прогресс и достижения ───────────────────────────────────────────────
  updateStreak: (name) => {
    if (Platform.OS === 'web') return 0;
    try {
      const today = new Date().toISOString().split('T')[0];
      const user = db.getFirstSync('SELECT last_login, streak_count FROM users WHERE username = ?;', [name]);
      if (user && user.last_login !== today) {
        db.runSync(
          'UPDATE users SET streak_count = streak_count + 1, last_login = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?;',
          [today, name]
        );
        return (user.streak_count || 0) + 1;
      }
      return user?.streak_count || 0;
    } catch {
      return 0;
    }
  },

  // Принимает числовой topic_id
  completeTopic: (username, topicId) => {
    if (Platform.OS === 'web') return;
    const numericId = parseInt(topicId, 10);
    if (isNaN(numericId)) return;
    db.runSync(
      'INSERT OR IGNORE INTO progress (username, topic_id, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP);',
      [username, numericId]
    );
    // Синхронно пишем и в user_progress для обратной совместимости
    db.runSync(
      'INSERT OR IGNORE INTO user_progress (username, topic_id, topic_key, status, updated_at) VALUES (?, ?, ?, \'completed\', CURRENT_TIMESTAMP);',
      [username, numericId, `topic_${numericId}`]
    );
  },

  getCompletedTopics: (username) => {
    if (Platform.OS === 'web') return [];
    const rows = db.getAllSync('SELECT topic_id FROM progress WHERE username = ?;', [username]);
    return rows.map(r => r.topic_id);
  },

  getLeaderboard: () => {
    if (Platform.OS === 'web') return [];
    return db.getAllSync(
      'SELECT server_id as id, username, email, balance, streak_count FROM users ORDER BY balance DESC, streak_count DESC LIMIT 10;'
    );
  },

  toggleBookmark: (username, topicId, isBookmarked) => {
    if (Platform.OS === 'web') return;
    isBookmarked
      ? db.runSync('DELETE FROM bookmarks WHERE username = ? AND topic_id = ?;', [username, topicId])
      : db.runSync(
          'INSERT OR IGNORE INTO bookmarks (username, topic_id, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP);',
          [username, topicId]
        );
  },

  getAchievements: (username) => {
    if (Platform.OS === 'web') return [];
    return db.getAllSync('SELECT badge_id, date FROM achievements WHERE username = ?;', [username]);
  },

  clearUserData: async (username) => {
    if (Platform.OS === 'web') return { success: true };
    try {
      console.log(`🧹 [DB] Clearing cache for: ${username}`);
      db.runSync('DELETE FROM progress WHERE username = ?;', [username]);
      db.runSync('DELETE FROM user_progress WHERE username = ?;', [username]);
      db.runSync('DELETE FROM achievements WHERE username = ?;', [username]);
      db.runSync('DELETE FROM bookmarks WHERE username = ?;', [username]);
      db.runSync('DELETE FROM notes WHERE username = ?;', [username]);
      db.runSync('DELETE FROM users WHERE username = ?;', [username]);
      console.log('✨ [DB] Cache cleared.');
      return { success: true };
    } catch (err) {
      console.error('❌ [DB] Cleanup failed:', err);
      return { success: false, error: err.message };
    }
  },
};

export const dbService = dbInternalService;
