import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://192.168.1.57:5000'; 

// Экспортируем константу напрямую как дефолтный модуль
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 8000, 
  headers: {
    'Content-Type': 'application/json',
  }
});

// ПЕРЕХВАТЧИК ЗАПРОСОВ (Добавляет токен)
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.log("Ошибка получения токена из хранилища");
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Простая функция перевода в транслит только для логов консоли
const toTranslit = (text) => {
  if (typeof text !== 'string') return JSON.stringify(text);
  const r = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м?':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch',
    'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
    'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'Zh','З':'Z',
    'И':'I','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R',
    'С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh','Щ':'Shch',
    'Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya'
  };
  return text.split('').map(c => r[c] || c).join('');
};
// ВРЕМЕННЫЙ СУПЕР-ЛОГГЕР ДЛЯ ВЫЯВЛЕНИЯ СКРЫТЫХ СЕТЕВЫХ ОШИБОК
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("\n?? ===== [ГЛУБОКИЙ СЕТЕВОЙ АУДИТ] =====");
    console.log("1. URL запроса:", error.config?.url);
    console.log("2. Метод:", error.config?.method?.toUpperCase());
    console.log("3. Статус-код ответа:", error.response?.status || "НЕТ ОТВЕТА (Сервер недоступен)");
    
    if (error.response) {
      console.log("4. Данные от сервера:", JSON.stringify(error.response.data));
    } else if (error.request) {
      console.log("4. Запрос ушел, но сервер промолчал. Технические детали:", {
        _response: error.request._response,
        status: error.request.status,
        readyState: error.request.readyState
      });
    } else {
      console.log("4. Ошибка до отправки запроса:", error.message);
    }
    
    console.log("5. Системный код ошибки:", error.code || "Отсутствует");
    console.log("=========================================\n");
    return Promise.reject(error);
  }
);


// ==========================================
// АДМИНСКИЕ МЕТОДЫ (ADMIN 2.0)
// ==========================================
export const adminService = {
  getDashboardStats: async () => {
    return apiClient.get('/api/admin/dashboard-stats');
  },
  createCourse: async (courseData) => {
    return apiClient.post('/api/admin/courses', courseData);
  },
  deleteCourse: async (courseId) => {
    return apiClient.delete(`/api/admin/courses/${courseId}`);
  }
};

// ==========================================
// СЕРВИС УПРАВЛЕНИЯ ПРОФИЛЕМ
// ==========================================
export const profileService = {
  deleteAccount: async (password) => {
    return apiClient.post('/api/user-delete-account', { password });
  }
};

// Классический дефолтный экспорт основного клиента
export default apiClient;
