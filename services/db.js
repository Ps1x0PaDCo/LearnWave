import * as SQLite from 'expo-sqlite';
export const db = SQLite.openDatabaseSync('learnwave_master_gold.db'); 
db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const initDatabase = () => {
try {
db.execSync(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    server_id INTEGER UNIQUE,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    balance INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 🌟 ИСПРАВЛЕНО: Создаем правильную таблицу courses без AUTOINCREMENT под логику экранов
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY, 
    server_id INTEGER UNIQUE,
    title TEXT NOT NULL, 
    subject_key TEXT NOT NULL UNIQUE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 🌟 ИСПРАВЛЕНО: Создаем правильную таблицу topics со всеми текстовыми полями лекций
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

  CREATE TABLE IF NOT EXISTS glossary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term TEXT NOT NULL UNIQUE,
    definition TEXT NOT NULL,
    subject_key TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log("✅ База данных успешно инициализирована (Таблицы courses/topics синхронизированы)");
} catch (error) {
console.error("❌ Ошибка инициализации БД:", error);
}
};

export const executeQuery = (sql, params = []) => {
try {
if (sql.trim().toLowerCase().startsWith('select')) {
const result = db.getAllSync(sql, params);
return { success: true, data: result };
} else {
const result = db.runSync(sql, params);
return { success: true, data: result };
}
} catch (error) {
console.error(`SQL Error (${sql}):`, error);
return { success: false, error };
}
};
initDatabase();
