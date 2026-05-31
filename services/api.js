import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

import { BASE_URL } from '../config'; // ?? Подтяни правильный относительный путь до config.js

const apiClient = axios.create({
  // ?? ИСПРАВЛЕНО: Указали прямой локальный IP ноутбука в Wi-Fi сети для работы на реальном смартфоне
  baseURL: 'http://192.168.1.57:5000', 
  timeout: 10000, // Рекомендую добавить таймаут 10 секунд, чтобы приложение не висло бесконечно при сбоях сети
});


// ==========================================
// 1. ИНТЕРЦЕПТОР ЗАПРОСОВ (Авто-добавление токена)
// ==========================================
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('user_token');
      if (token) {
        // Автоматически прикрепляем JWT-токен к каждому запросу в облако
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
    // Если сервер вернул 401 (Сессия истекла / Токен невалиден)
    if (error.response && error.response.status === 401) {
      console.log('?? [API Client] Токен протух (401). Отправляем событие разлогина...');

      try {
        await SecureStore.deleteItemAsync('user_token');
        await AsyncStorage.removeItem('current_user');

        // ?? ИСПРАВЛЕНО: Вместо прямого вызова хука, шлем безопасное системное событие
        DeviceEventEmitter.emit('FORCE_LOGOUT');
      } catch (cleanError) {
        console.log('? [API Client] Ошибка при очистке кэша устройства:', cleanError.message);
      }
    }
    return Promise.reject(error);
  }
);

// Сервис профиля (сохраняем твою структуру)
export const profileService = {
  deleteAccount: (password) => apiClient.post('/api/user-delete-account', { password }),
};

export default apiClient;
