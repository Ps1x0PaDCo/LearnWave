import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const apiClient = axios.create({
  // Твой первоначальный базовый URL. Замени IP на тот, который у тебя сейчас в левой консоли сервера!
  baseURL: 'http://192.168.1.38:5000', 
  timeout: 10000, 
});

// ==========================================
// ИНТЕРЦЕПТОР ЗАПРОСОВ (Добавляет префикс /api ко всем путям!)
// ==========================================
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // ИСПРАВЛЕНО: Возвращаем автоматическую подстановку префикса под твой сервер
      if (config.url && !config.url.startsWith('/api')) {
        config.url = `/api${config.url}`;
      }
      
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
// ИНТЕРЦЕПТОР ОТВЕТОВ (Защита 401)
// ==========================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
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
// МЕТОДЫ АДМИНИСТРАТОРА (Которые нужны для работы твоей AdminPanel)
// ==========================================
export const adminService = {
  getDashboardStats: () => apiClient.get('/admin/stats'),
  getCourses: () => apiClient.get('/courses'),
  getUserProgress: (username) => apiClient.get('/progress', { params: { username } }),
  createCourse: (payload) => apiClient.post('/courses', payload),
  createLecture: (payload) => apiClient.post('/topics', payload),
};

export const profileService = {
  deleteAccount: (password) => apiClient.post('/user-delete-account', { password }),
};

export default apiClient;
