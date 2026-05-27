import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('learnwave_master_gold.db'); 

db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const initDatabase = () => {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER UNIQUE, -- ID из PostgreSQL
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'student',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Ключевое поле для синхронизации
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        subject_id INTEGER,
        completed_lessons INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
      );
    `);
    console.log("✅ База данных успешно инициализирована (с поддержкой синхронизации)");
  } catch (error) {
    console.error("❌ Ошибка инициализации БД:", error);
  }
};

export const executeQuery = (sql, params = []) => {
  try {
    // Используем метод runSync для INSERT/UPDATE/DELETE и getAllSync для SELECT
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
