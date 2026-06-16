import { Platform } from 'react-native';

// ─── Веб-заглушка для SQLite ───────────────────────────────────────────────
// На вебе expo-sqlite недоступен. Данные берутся с сервера через API.
const webStub = {
  getAllSync: () => [],
  getFirstSync: () => null,
  runSync: () => {},
  execSync: () => {},
};

let db;

if (Platform.OS === 'web') {
  db = webStub;
} else {
  const SQLite = require('expo-sqlite');
  db = SQLite.openDatabaseSync('learnwave_master_gold.db');
  try {
    db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  } catch (e) {
    console.error('❌ PRAGMA error:', e);
  }
}

export { db };

// ─── Универсальный хелпер для запросов ────────────────────────────────────
export const executeQuery = (sql, params = []) => {
  if (Platform.OS === 'web') return { success: true, data: [] };
  try {
    if (sql.trim().toLowerCase().startsWith('select')) {
      return { success: true, data: db.getAllSync(sql, params) };
    } else {
      return { success: true, data: db.runSync(sql, params) };
    }
  } catch (error) {
    console.error(`SQL Error (${sql}):`, error);
    return { success: false, error };
  }
};
