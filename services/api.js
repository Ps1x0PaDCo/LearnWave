import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Хранилище токена: SecureStore на нативе, AsyncStorage на вебе ─────────
const tokenStorage = {
  get: async (key) => {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  set: async (key, value) => {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    const SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  delete: async (key) => {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    const SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};

// ─── Событие принудительного логаута: DeviceEventEmitter на нативе ─────────
const emitForceLogout = () => {
  if (Platform.OS !== 'web') {
    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit('FORCE_LOGOUT');
  } else {
    // На вебе используем кастомное событие браузера
    window.dispatchEvent(new Event('FORCE_LOGOUT'));
  }
};

// ─── Базовый URL из переменной окружения ──────────────────────────────────
// В файле .env (корень проекта) пропиши:
//   EXPO_PUBLIC_API_URL=https://твой-сервер.railway.app
// Для локальной разработки:
//   EXPO_PUBLIC_API_URL=http://localhost:5000
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// ─── Интерцептор запросов: добавляет /api и токен авторизации ─────────────
apiClient.interceptors.request.use(
  async (config) => {
    // Автоматически добавляем /api-префикс если его нет
    if (config.url && !config.url.startsWith('/api')) {
      config.url = `/api${config.url}`;
    }
    try {
      const token = await tokenStorage.get('user_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('⚠️ [API] Ошибка чтения токена:', error.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Интерцептор ответов: обработка 401 ───────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await tokenStorage.delete('user_token');
        await AsyncStorage.removeItem('current_user');
        emitForceLogout();
      } catch (cleanError) {
        console.log('⚠️ [API] Ошибка при очистке токена:', cleanError.message);
      }
    }
    return Promise.reject(error);
  }
);

// ─── Сервисы ──────────────────────────────────────────────────────────────
export const adminService = {
  getDashboardStats:  ()         => apiClient.get('/admin/stats'),
  getCourses:         ()         => apiClient.get('/courses'),
  getAdminCourses:    ()         => apiClient.get('/admin/courses'),
  getUsers:           ()         => apiClient.get('/admin/users'),
  getUserProgress:    (user) => apiClient.get('/admin/user-progress', {
    params: typeof user === 'string' ? { username: user } : {
      id: user?.id,
      email: user?.email,
      username: user?.username,
    }
  }),
  createCourse:       (payload)  => apiClient.post('/admin/courses', payload),
  updateCourse:       (courseId, payload) => apiClient.put(`/admin/courses/${courseId}`, payload),
  publishCourse:      (courseId, isPublished) => apiClient.patch(`/admin/courses/${courseId}/publish`, { is_published: isPublished }),
  deleteCourse:       (courseId) => apiClient.delete(`/admin/courses/${courseId}`),
  createLecture:      (payload)  => apiClient.post('/topics', payload),
  getTopics:          ()         => apiClient.get('/topics'),
  updateTopic:        (topicId, payload) => apiClient.put(`/admin/topics/${topicId}`, payload),
  deleteTopic:        (topicId) => apiClient.delete(`/admin/topics/${topicId}`),
};

export const profileService = {
  deleteAccount: (password) => apiClient.post('/user-delete-account', { password }),
  updateName: (username) => apiClient.patch('/profile/name', { username }),
};

// tokenStorage экспортируем для использования в AuthContext
export { tokenStorage };

export default apiClient;
