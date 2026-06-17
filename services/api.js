import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// в”Ђв”Ђв”Ђ РҐСЂР°РЅРёР»РёС‰Рµ С‚РѕРєРµРЅР°: SecureStore РЅР° РЅР°С‚РёРІРµ, AsyncStorage РЅР° РІРµР±Рµ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

// в”Ђв”Ђв”Ђ РЎРѕР±С‹С‚РёРµ РїСЂРёРЅСѓРґРёС‚РµР»СЊРЅРѕРіРѕ Р»РѕРіР°СѓС‚Р°: DeviceEventEmitter РЅР° РЅР°С‚РёРІРµ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const emitForceLogout = () => {
  if (Platform.OS !== 'web') {
    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit('FORCE_LOGOUT');
  } else {
    // РќР° РІРµР±Рµ РёСЃРїРѕР»СЊР·СѓРµРј РєР°СЃС‚РѕРјРЅРѕРµ СЃРѕР±С‹С‚РёРµ Р±СЂР°СѓР·РµСЂР°
    window.dispatchEvent(new Event('FORCE_LOGOUT'));
  }
};

// в”Ђв”Ђв”Ђ Р‘Р°Р·РѕРІС‹Р№ URL РёР· РїРµСЂРµРјРµРЅРЅРѕР№ РѕРєСЂСѓР¶РµРЅРёСЏ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// Р’ С„Р°Р№Р»Рµ .env (РєРѕСЂРµРЅСЊ РїСЂРѕРµРєС‚Р°) РїСЂРѕРїРёС€Рё:
//   EXPO_PUBLIC_API_URL=https://С‚РІРѕР№-СЃРµСЂРІРµСЂ.railway.app
// Р”Р»СЏ Р»РѕРєР°Р»СЊРЅРѕР№ СЂР°Р·СЂР°Р±РѕС‚РєРё:
//   EXPO_PUBLIC_API_URL=http://localhost:5000
const BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export const API_BASE_URL = BASE_URL;

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// в”Ђв”Ђв”Ђ РРЅС‚РµСЂС†РµРїС‚РѕСЂ Р·Р°РїСЂРѕСЃРѕРІ: РґРѕР±Р°РІР»СЏРµС‚ /api Рё С‚РѕРєРµРЅ Р°РІС‚РѕСЂРёР·Р°С†РёРё в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
apiClient.interceptors.request.use(
  async (config) => {
    // РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРё РґРѕР±Р°РІР»СЏРµРј /api-РїСЂРµС„РёРєСЃ РµСЃР»Рё РµРіРѕ РЅРµС‚
    if (config.url && !config.url.startsWith('/api')) {
      config.url = `/api${config.url}`;
    }
    try {
      const token = await tokenStorage.get('user_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('вљ пёЏ [API] РћС€РёР±РєР° С‡С‚РµРЅРёСЏ С‚РѕРєРµРЅР°:', error.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// в”Ђв”Ђв”Ђ РРЅС‚РµСЂС†РµРїС‚РѕСЂ РѕС‚РІРµС‚РѕРІ: РѕР±СЂР°Р±РѕС‚РєР° 401 в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await tokenStorage.delete('user_token');
        await AsyncStorage.removeItem('current_user');
        emitForceLogout();
      } catch (cleanError) {
        console.log('вљ пёЏ [API] РћС€РёР±РєР° РїСЂРё РѕС‡РёСЃС‚РєРµ С‚РѕРєРµРЅР°:', cleanError.message);
      }
    }
    return Promise.reject(error);
  }
);

// в”Ђв”Ђв”Ђ РЎРµСЂРІРёСЃС‹ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

// tokenStorage СЌРєСЃРїРѕСЂС‚РёСЂСѓРµРј РґР»СЏ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ РІ AuthContext
export { tokenStorage };

export default apiClient;


