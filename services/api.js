import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

import { BASE_URL } from '../config'; 

const apiClient = axios.create({
  // Добавлен обязательный префикс путей под архитектуру монолитного сервера
  baseURL: 'https://learnwave-test.loca.lt', 
  timeout: 10000, 
});

// ==========================================
// 1. ИНТЕРЦЕПТОР ЗАПРОСОВ (Авто-добавление токена)
// ==========================================
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('user_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('? [API Client] Ошибка чтения токена из SecureStore:', error.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// 2. ИНТЕРЦЕПТОР ОТВЕТОВ (Защита от протухания токена 401)
// ==========================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log('?? [API Client] Токен протух (401). Отправляем событие разлогина...');

      try {
        await SecureStore.deleteItemAsync('user_token');
        await AsyncStorage.removeItem('current_user');

        DeviceEventEmitter.emit('FORCE_LOGOUT');
      } catch (cleanError) {
        console.log('? [API Client] Ошибка при очистке кэша устройства:', cleanError.message);
      }
    }
    return Promise.reject(error);
  }
);
// ==========================================
// 3. СЕРВИС АДМИНИСТРИРОВАНИЯ (Связующий контур для AdminPanel)
// ==========================================
export const adminService = {
  // Получение живой статистики (курсы, сессии) с сервера
  getDashboardStats: () => apiClient.get('/api/admin/stats'), // или твой точный роут статистики
  
  // Получение списка всех курсов для подсчета
  getCourses: () => apiClient.get('/api/courses'),

  // ПО ФАКТУ: Прямой сетевой запрос к твоему работающему эндпоинту прогресса
  getUserProgress: (username) => apiClient.get('/api/progress', { params: { username } }),

  // Создание нового курса
  createCourse: (payload) => apiClient.post('/api/courses', payload),

  // Загрузка новой лекции/темы
  createLecture: (payload) => apiClient.post('/api/topics', payload),
};

export const profileService = {
  // Путь сокращен, так как префикс /api теперь автоматически подставляется клиентом
  deleteAccount: (password) => apiClient.post('/user-delete-account', { password }),
};

export default apiClient;
