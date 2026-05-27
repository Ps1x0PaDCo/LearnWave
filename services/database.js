import * as Crypto from 'expo-crypto';
import { db } from './db'; 

// "Белый список" супер-админов для защиты от подмены ролей в SQLite
const SUPER_ADMINS = ['admin@admin.com', 'your-email@example.com'];

const hashPassword = async (password) => {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
};

const dbInternalService = {
  init: async () => {
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          server_id INTEGER UNIQUE,
          email TEXT NOT NULL UNIQUE, 
          username TEXT NOT NULL UNIQUE, 
          password TEXT NOT NULL, 
          role TEXT DEFAULT 'student', 
          streak_count INTEGER DEFAULT 0, 
          last_login TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          server_id INTEGER UNIQUE,
          title TEXT NOT NULL, 
          subject_key TEXT NOT NULL UNIQUE,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS topics (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          server_id INTEGER UNIQUE,
          subject_key TEXT NOT NULL, 
          title TEXT NOT NULL, 
          description TEXT, 
          content TEXT NOT NULL, 
          quiz_question TEXT, 
          quiz_answer TEXT, 
          difficulty INTEGER DEFAULT 1,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          username TEXT NOT NULL, 
          topic_title TEXT NOT NULL, 
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(username, topic_title)
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
          topic_title TEXT NOT NULL, 
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(username, topic_title)
        );
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          username TEXT NOT NULL, 
          topic_title TEXT NOT NULL, 
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

      const count = db.getFirstSync("SELECT COUNT(*) as count FROM topics;");
      if (count.count === 0) {
        db.runSync(`INSERT INTO topics (subject_key, title, description, content) VALUES 
          ('Math', 'Основы тригонометрии', 'Синусы и косинусы', '### Введение\nТекст лекции...'),
          ('Informatics', 'Основы Python', 'Первые шаги', '### Hello World\nТекст лекции...');`);

        db.runSync(`INSERT OR IGNORE INTO courses (title, subject_key) VALUES 
          ('Математика', 'Math'), ('IT технологии', 'Informatics');`);
      }
      return [];
    } catch (err) { console.error("DB Init Error:", err); return []; }
  },
getGlossary: (subject = null) => {
  const query = subject 
    ? 'SELECT * FROM glossary WHERE subject_key = ? ORDER BY term ASC'
    : 'SELECT * FROM glossary ORDER BY term ASC';
  return db.getAllSync(query, subject ? [subject] : []);
},

  updateNickname: async (oldUsername, newUsername) => {
    try {
      const now = new Date().toISOString();
      db.runSync('UPDATE users SET username = ?, updated_at = ? WHERE username = ?;', [newUsername.trim(), now, oldUsername]);
      db.runSync('UPDATE progress SET username = ?, updated_at = ? WHERE username = ?;', [newUsername, now, oldUsername]);
      db.runSync('UPDATE achievements SET username = ?, updated_at = ? WHERE username = ?;', [newUsername, now, oldUsername]);
      db.runSync('UPDATE bookmarks SET username = ?, updated_at = ? WHERE username = ?;', [newUsername, now, oldUsername]);
      db.runSync('UPDATE notes SET username = ?, updated_at = ? WHERE username = ?;', [newUsername, now, oldUsername]);
      return { success: true, newUsername };
    } catch (err) { return { success: false, error: "Ник занят" }; }
  },

  registerUser: async (email, username, password) => {
    try {
      const hashed = await hashPassword(password);
      const cleanEmail = email.toLowerCase().trim();
      // ХАРДКОД ЗАЩИТА: Роль админа только для списка SUPER_ADMINS
      const role = SUPER_ADMINS.includes(cleanEmail) ? 'admin' : 'student';
      const now = new Date().toISOString();
      
      db.runSync(
        'INSERT OR REPLACE INTO users (email, username, password, role, updated_at) VALUES (?, ?, ?, ?, ?);', 
        [cleanEmail, username.trim(), hashed, role, now]
      );
      const newUser = db.getFirstSync('SELECT * FROM users WHERE email = ?;', [cleanEmail]);
      return { success: true, user: newUser };
    } catch (err) { return { success: false, error: "Ошибка регистрации" }; }
  },

  loginUser: async (email, password) => {
    try {
      const hashed = await hashPassword(password);
      const cleanEmail = email.toLowerCase().trim();
      // При логине принудительно обновляем роль из SUPER_ADMINS (на случай ручного вмешательства в БД)
      const role = SUPER_ADMINS.includes(cleanEmail) ? 'admin' : 'student';
      db.runSync('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?;', [role, cleanEmail]);
      
      const user = db.getFirstSync('SELECT * FROM users WHERE email = ? AND password = ?;', [cleanEmail, hashed]);
      return user ? { success: true, user } : { success: false, error: 'Неверные данные' };
    } catch (err) { return { success: false, error: 'Ошибка входа' }; }
  },

  resetPassword: async (email, newPass) => {
    try {
      const hashed = await hashPassword(newPass);
      const cleanEmail = email.toLowerCase().trim();
      db.runSync('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?;', [hashed, cleanEmail]);
      return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка БД' }; }
  },

  updateStreak: (name) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const user = db.getFirstSync("SELECT last_login, streak_count FROM users WHERE username = ?;", [name]);
      if (user && user.last_login !== today) {
        db.runSync("UPDATE users SET streak_count = streak_count + 1, last_login = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?;", [today, name]);
        return (user.streak_count || 0) + 1;
      }
      return user?.streak_count || 0;
    } catch (e) { return 0; }
  },

  getLeaderboard: () => db.getAllSync(`
    SELECT u.username, COUNT(p.topic_title) as score 
    FROM users u 
    LEFT JOIN progress p ON u.username = p.username 
    GROUP BY u.username 
    ORDER BY score DESC 
    LIMIT 10;
  `),
  
  toggleBookmark: (n, t, isB) => isB 
    ? db.runSync('DELETE FROM bookmarks WHERE username = ? AND topic_title = ?;', [n, t]) 
    : db.runSync('INSERT OR IGNORE INTO bookmarks (username, topic_title, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP);', [n, t]),
  
  completeTopic: (n, t) => db.runSync('INSERT OR IGNORE INTO progress (username, topic_title, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP);', [n, t]),
  
  getAchievements: (n) => db.getAllSync('SELECT badge_id, date FROM achievements WHERE username = ?;', [n]),
  
  getCompletedTopics: (n) => db.getAllSync('SELECT topic_title FROM progress WHERE username = ?;', [n]).map(r => r.topic_title),

  // === ОБНОВЛЕННЫЙ МЕТОД ВНУТРЬ dbInternalService ===
  saveGlossaryTerm: (term, definition, subjectKey) => {
    try {
      const now = new Date().toISOString();
      
      // Хитрый декодер: проверяем, зашифрована ли строка в Base64. 
      // Если да — расшифровываем в нормальный русский текст, если нет — оставляем как есть.
      const decodeBase64 = (str) => {
        if (!str) return '';
        const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
        if (base64Regex.test(str) && str.length > 8) {
          try { return Buffer.from(str, 'base64').toString('utf-8'); } catch(e) { return str; }
        }
        return str;
      };

      const cleanTerm = decodeBase64(term).trim();
      const cleanDefinition = decodeBase64(definition).trim();

      db.runSync(
        'INSERT OR REPLACE INTO glossary (term, definition, subject_key, updated_at) VALUES (?, ?, ?, ?);',
        [cleanTerm, cleanDefinition, subjectKey, now]
      );
      return { success: true };
    } catch (err) {
      console.error('❌ [SQLite Glossary Sync Error]:', err);
      return { success: false, error: err.message };
    }
  },




    // === ДОБАВЬ ЭТОТ МЕТОД ВНУТРЬ dbInternalService ===
  clearUserData: async (username) => {
    try {
      console.log(`🧹 [SQLite] Starting full cache cleanup for: ${username}`);
      
      // Зачищаем все таблицы, привязанные к никнейму пользователя
      db.runSync('DELETE FROM progress WHERE username = ?;', [username]);
      db.runSync('DELETE FROM achievements WHERE username = ?;', [username]);
      db.runSync('DELETE FROM bookmarks WHERE username = ?;', [username]);
      db.runSync('DELETE FROM notes WHERE username = ?;', [username]);
      
      // Удаляем и самого пользователя из локальной SQLite
      db.runSync('DELETE FROM users WHERE username = ?;', [username]);

      console.log('✨ [SQLite] All local tables purged successfully.');
      return { success: true };
    } catch (err) {
      console.error('❌ [SQLite Error] Cleanup failed:', err);
      return { success: false, error: err.message };
    }
  },

};

export const dbService = dbInternalService;
