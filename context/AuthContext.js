import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient, { profileService } from '../services/api';
import { dbService } from '../services/database';
import { db } from '../services/db';
import { DeviceEventEmitter } from 'react-native';
import { API_URL } from '../config';
import { Platform } from 'react-native';

export const AuthContext = createContext();
export const CoursesContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [completedCourses, setCompletedCourses] = useState([]);
  
  const [activeBorder, setActiveBorder] = useState('none'); // Текущая рамка ('none', 'bronze', 'silver', 'gold')
  // 💡 Метод для транзакционного списания монет при покупке кастомизации
    // 💡 Метод для транзакционного списания монет при покупке кастомизации
  const buyInterfaceBorder = async (borderId, cost) => {
    if (!user || user.balance < cost) {
      return { success: false, error: 'Недостаточно монет на балансе' };
    }

    try { // 🟢 Главный КОРНЕВОЙ блок try
      // 1. Списываем монеты на сервере PostgreSQL (через apiClient)
      const newBalance = user.balance - cost;
      const response = await apiClient.post('/api/user/update-balance', { 
        username: user.username, 
        balance: newBalance 
      });

      if (response.data.success) {
        // 2. Обновляем локальный стейт пользователя
        setUser(prev => prev ? { ...prev, balance: newBalance } : null);
        
        // 3. Сохраняем купленную рамку в память Android устройства
        setActiveBorder(borderId);
        await AsyncStorage.setItem(`border_${user.username}`, borderId);
        
        // 4. ИЗОЛИРОВАННОЕ ОБНОВЛЕНИЕ КЭША SQLite
        try { // 🟢 Вложенный блок try
          db.runSync(
            'UPDATE users SET balance = ? WHERE username = ?;',
            [newBalance, user.username]
          );
        } catch (sqliteErr) { // 🔴 Вложенный блок catch
          console.log('⚠️ [SQLite Shop Cache Error Ignored]:', sqliteErr.message);
        }

        return { success: true };
      }
      return { success: false, error: 'Сервер отклонил транзакцию' };

    } catch (err) { // 🔴 Главный КОРНЕВОЙ блок catch (который потерялся!)
      console.log('❌ Ошибка транзакции магазина:', err.message);
      return { success: false, error: 'Ошибка сетевого соединения с сервером' };
    }
  }; // Конец функции

  // Состояния для всплывающего Pop-up уведомления достижений
  const [achievementModal, setAchievementModal] = useState(false);
  const [unlockedAward, setUnlockedAward] = useState(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Краткий справочник условий для триггера всплывающего окна
  const checkAchievementTriggers = useCallback((lecturesCount, currentStreak, currentXP) => {
    // 💡 ИСПРАВЛЕНО: Чистый русский текст в UTF-8 для динамических названий ачивок
    if (lecturesCount === 1) return { title: 'Первая волна 🌊', icon: 'water', color: '#4A90E2' };
    if (lecturesCount === 5) return { title: 'Магистр знаний 🎓', icon: 'medal', color: '#9B59B6' };
    if (currentStreak === 3) return { title: 'В ударе 🔥', icon: 'flame', color: '#FF5E5E' };
    if (currentXP >= 500) return { title: 'Золотой запас 🏆', icon: 'trophy', color: '#F1C40F' };
    return null;
  }, []);


  const triggerAchievementPopUp = (award) => {
    setUnlockedAward(award);
    setAchievementModal(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  // Синхронизации прогресса
  const syncProgress = useCallback(async (nickname) => {
    try {
      console.log('📡 [Sync] Starting progress synchronization with PostgreSQL...');
      const res = await apiClient.get('/api/progress');

      if (res.data.success) {
        const cloudCompleted = res.data.completed || []; // Массив ID с сервера (например [1, 2])

        // 💡 ИСПРАВЛЕНО: Форматируем прилетающие ID с сервера в строки 'topic_1'
        const formattedKeys = cloudCompleted.map(id => typeof id === 'object' ? `topic_${id.topic_id}` : `topic_${id}`);

        // Записываем отформатированные текстовые ключи в локальную базу SQLite
        formattedKeys.forEach(topicKey => dbService.completeTopic(nickname, topicKey));

        // Клади в стейт правильные строки, чтобы экран их распознал!
        setCompletedCourses(formattedKeys);
        console.log('✅ [Sync] Databases synced successfully (PostgreSQL -> SQLite).');
      }
    } catch (e) {
      console.log("⚠️ [Sync] Offline mode activated. Loading local progress from SQLite.");

      // 💡 ИСПРАВЛЕНО: Прямой и безопасный запрос в SQLite, если сервер недоступен
      try {
        const done = db.getAllSync(
          "SELECT topic_key FROM user_progress WHERE username = ? AND status = 'completed'",
          [nickname]
        );
        setCompletedCourses(done.map(row => row.topic_key));
      } catch (sqliteErr) {
        console.log('❌ Ошибка чтения оффлайн-прогресса:', sqliteErr.message);
        setCompletedCourses([]);
      }
    }
  }, []);


  // === ОБНОВЛЕННЫЙ БЛОК СИНХРОНИЗАЦИИ И АВТОРИЗАЦИИ ===

  // Функция синхронизации глоссария с PostgreSQL в локальную SQLite
  const syncGlossary = useCallback(async () => {
    try {
      console.log('?? [Sync] Starting glossary synchronization with PostgreSQL...');
      const res = await apiClient.get('/api/glossary');
      if (res.data.success) {
        const cloudGlossary = res.data.glossary;
        cloudGlossary.forEach(item => {
          dbService.saveGlossaryTerm(item.term, item.definition, item.subject_key);
        });
        console.log('? [Sync] Glossary synced successfully (PostgreSQL -> SQLite).');
      }
    } catch (e) {
      console.log("?? [Sync] Glossary offline mode activated. Loading local formulas from SQLite.");
    }
  }, []);

  // Функция автоматического скачивания тем из облака в локальную SQLite
  const syncTopics = useCallback(async () => {
    try {
      console.log('🔄 [Sync] Starting topics synchronization with PostgreSQL...');
      const res = await apiClient.get('/api/topics');
      if (res.data.success) {
        const cloudTopics = res.data.topics || [];

        // Сначала очистим старые локальные темы, чтобы не дублировать
        db.runSync('DELETE FROM topics');

        // Записываем новые темы в SQLite телефона
        cloudTopics.forEach(topic => {
          db.runSync(
            'INSERT INTO topics (id, subject_key, title) VALUES (?, ?, ?)',
            [topic.id, topic.subject_key, topic.title]
          );
        });
        console.log('✅ [Sync] Topics synced successfully (PostgreSQL -> SQLite).');
      }
    } catch (e) {
      console.log("⚠️ [Sync] Topics offline mode activated. Using cached local topics.");
    }
  }, []);



  useEffect(() => {
    async function init() {
      try {
        await dbService.init();
        const savedTheme = await AsyncStorage.getItem('user_theme');
        if (savedTheme) setIsDarkMode(savedTheme === 'dark');

        syncGlossary();
        syncTopics();

        const token = await SecureStore.getItemAsync('user_token');
        if (token) {
          const res = await apiClient.get('/api/profile').catch(() => null);

    if (res?.data?.success && res.data.user && res.data.user.length > 0) {
      const fetchedUser = res.data.user[0]; // Наш чистый объект юзера
      
      setUser(fetchedUser);
      setIsLoggedIn(true);
      setStreak(fetchedUser.streak_count || 0);
      
      // 💡 ИСПРАВЛЕНО: Фоновые SQLite-методы запускаем ТОЛЬКО на смартфонах, в Web-версии пропускаем!
      if (Platform.OS !== 'web') {
        await syncProgress(fetchedUser.username);
        try {
          const done = db.getAllSync(
            "SELECT topic_key FROM user_progress WHERE username = ? AND status = 'completed'",
            [fetchedUser.username]
          );
          setCompletedCourses(done.map(row => row.topic_key));
        } catch (err) {
          console.log('❌ Ошибка загрузки галочек при старте:', err.message);
        }
      }
    }
  }

        // 💡 ИСПРАВЛЕНО: Слушаем событие разлогина из api.js внутри тела хука useEffect!
        const subscription = DeviceEventEmitter.addListener('FORCE_LOGOUT', () => {
          logout();
        });

        // Чистим слушатель при размонтировании компонента, чтобы не было утечек памяти
        return () => subscription.remove();

      } catch (e) {
        console.log('❌ [Init] Ошибка инициализации:', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [syncProgress, syncGlossary, syncTopics]);

   // 💡 Динамический расчет уровня на основе баланса пользователя
    const calculateLevel = (totalXp) => {
    const xp = totalXp || 0;
    const xpPerLevel = 100; // Количество очков для повышения уровня
    
    const level = Math.floor(xp / xpPerLevel) + 1;
    const xpInCurrentLevel = xp % xpPerLevel; 
    const progress = xpInCurrentLevel / xpPerLevel; // Значение от 0 до 1 для прогресс-бара
    const xpRemaining = xpPerLevel - xpInCurrentLevel;
    
    return { level, xpInCurrentLevel, progress, xpRemaining, xpPerLevel };
  };

  const login = async (email, password) => {
    try {
      console.log('📡 [AuthContext] Запрос авторизации на сервер...');
      const response = await apiClient.post('/api/login', { email, password });

      if (response.data.success) {
        const { token, user: userData } = response.data;

        // Сохраняем сессию на устройстве
        await SecureStore.setItemAsync('user_token', token);
        await AsyncStorage.setItem('current_user', userData.username);

        // Прописываем токен по умолчанию в Axios для фоновой синхронизации
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Кэшируем профиль в SQLite для оффлайн-режима и лидерборда
        try {
          db.runSync(
            'INSERT OR REPLACE INTO users (email, username, password, role, balance, streak_count) VALUES (?, ?, ?, ?, ?, ?);',
            [email.toLowerCase().trim(), userData.username, 'auth_session', userData.role || 'student', userData.balance || 0, userData.streak_count || 0]
          );
        } catch (sqliteErr) {
          console.log('⚠️ [SQLite Cache Error]:', sqliteErr.message);
        }

        // Обновляем глобальные стейты (Вход выполнен!)
        setUser(userData);
        setIsLoggedIn(true);
        setStreak(userData.streak_count || 0);
        /*try {
          const done = db.getAllSync(
            "SELECT topic_key FROM user_progress WHERE username = ? AND status = 'completed'",
            [userData.username]
          );
          setCompletedCourses(done.map(row => row.topic_key));
        } catch (err) {
          console.log('❌ Ошибка загрузки галочек при логине:', err.message);
        }
          */

        // Запускаем фоновое обновление контента
        syncProgress(userData.username);
        syncGlossary();
        syncTopics();

        return { success: true };
      }
    } catch (error) {
      console.log('❌ Ошибка метода login:', error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Неверный email или пароль.'
      };
    }
  };



  const register = async (email, username, password) => {
    try {
      const res = await apiClient.post('/api/register', { email, username, password });
      if (res.data.success) return await login(email, password);
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Ошибка соединения' };
    }
  };

  // ФУНКЦИЯ БЕЗОПАСНОГО ВЫХОДА (LOGOUT)
  const logout = async () => {
    console.log('?? [AuthContext] Выход из аккаунта, очистка сессии устройства...');
    await SecureStore.deleteItemAsync('user_token');
    await AsyncStorage.removeItem('current_user');
    setUser(null);
    setIsLoggedIn(false);
    setCompletedCourses([]);
    setStreak(0);
  };

  // НАДЕЖНЫЙ ВЫЗОВ УДАЛЕНИЯ ЧЕРЕЗ PROFILE_SERVICE
  const deleteUserAccount = async (password) => {
    try {
      console.log('?? [AuthContext] Sending secure delete request via profileService...');

      const currentUserNickname = user?.username;
      const response = await profileService.deleteAccount(password);

      if (response.data.success) {
        console.log('?? [AuthContext] Deletion successful. Clearing device cache...');

        // Чистим локальную SQLite при удалении
        if (currentUserNickname) {
          await dbService.clearUserData(currentUserNickname);
        }

        await SecureStore.deleteItemAsync('user_token');
        await AsyncStorage.removeItem('current_user');
        if (currentUserNickname) {
          await AsyncStorage.removeItem(`avatar_${currentUserNickname}`);
        }

        setUser(null);
        setIsLoggedIn(false);
        setCompletedCourses([]);
        setStreak(0);

        return { success: true };
      }
    } catch (error) {
      console.log('? [AuthContext] Deletion error details:', error.response?.data?.error || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка проверки пароля или таймаут сервера.'
      };
    }
  };


  // --- НАЧАЛО ИСПРАВЛЕННОГО БЛОКА НАЧИСЛЕНИЯ И СИНХРОНИЗАЦИИ ---
  const completeTopic = (username, topicKey, topicId) => {
    // Гарантируем, что ключ темы — это строка формата topic_ID
    const finalKey = topicKey || `topic_${topicId}`;

    // Записываем прогресс в локальную базу SQLite
    dbService.completeTopic(username, finalKey);

    // Отправляем прогресс на сервер PostgreSQL и забираем монеты
    apiClient.post('/api/progress', { topic_id: topicId })
      .then((res) => {
        if (res.data.success && res.data.reward) {
          // Обновляем баланс монет в оперативной памяти приложения
          setUser(prev => prev ? { ...prev, balance: (prev.balance || 0) + res.data.reward } : null);
        }
      })
      .catch((e) => console.log('❌ Ошибка отправки прогресса на бэкенд:', e.message));

    // Обновляем стейт выполненных курсов, чтобы галочки загорелись мгновенно
    setCompletedCourses(prev => {
      // Защита от undefined и дубликатов: собираем чистый массив строк
      const currentList = Array.isArray(prev) ? prev : [];
      const updated = [...new Set([...currentList, finalKey])];

      // Считаем XP и проверяем триггеры глобальных достижений
      const currentXP = (user?.balance || 0) + 50;
      const award = checkAchievementTriggers(updated.length, streak, currentXP);

      if (award) {
        triggerAchievementPopUp(award);
      }
      return updated;
    });
  };
  // --- КОНЕЦ ИСПРАВЛЕННОГО БЛОКА ---


  return (
    <AuthContext.Provider value={{
      user, isLoggedIn, isDarkMode, streak, isLoading,
      nickname: user?.username, userRole: user?.role, calculateLevel,
      login, register, logout, deleteUserAccount,
       completedCourses, setCompletedCourses, activeBorder, setActiveBorder,setUser,
      toggleTheme: async () => {
        const n = !isDarkMode; setIsDarkMode(n);
        await AsyncStorage.setItem('user_theme', n ? 'dark' : 'light');
      },
      completeTopic,
      getLeaderboard: dbService.getLeaderboard,
      executeRaw: (q, p) => db.getAllSync(q, p)
      
    }}>
      <CoursesContext.Provider value={{ completedCourses, setCompletedCourses }}>
        {children}

        {/* ГЛОБАЛЬНЫЙ POP-UP УВЕДОМЛЕНИЙ О ДОСТИЖЕНИЯХ */}
        <Modal visible={achievementModal} transparent animationType="fade">
          <View style={popupStyles.overlay}>
            <Animated.View style={[popupStyles.box, { transform: [{ scale: scaleAnim }] }]}>
              <View style={[popupStyles.iconRing, { backgroundColor: unlockedAward?.color + '20' }]}>
                <Ionicons name={unlockedAward?.icon || 'trophy'} size={44} color={unlockedAward?.color || '#F1C40F'} />
              </View>
              <Text style={popupStyles.title}>Достижение разблокировано!</Text>
              <Text style={popupStyles.name}>«{unlockedAward?.title}»</Text>
              <Text style={popupStyles.sub}>Загляните во вкладку достижений, чтобы забрать награду.</Text>

              <TouchableOpacity
                style={[popupStyles.btn, { backgroundColor: unlockedAward?.color || '#4A90E2' }]}
                onPress={() => {
                  scaleAnim.setValue(0);
                  setAchievementModal(false);
                }}
              >
                <Text style={popupStyles.btnText}>Отлично</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

      </CoursesContext.Provider>
    </AuthContext.Provider>
  );
};

const popupStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  box: { backgroundColor: '#FFF', borderRadius: 32, padding: 30, alignItems: 'center', width: '100%', maxWidth: 340, elevation: 10 },
  iconRing: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 13, fontWeight: '900', color: '#A0AEC0', letterSpacing: 1, marginBottom: 6 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1A202C', marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 12, color: '#718096', textAlign: 'center', lineHeight: 18, marginBottom: 25, paddingHorizontal: 10 },
  btn: { width: '100%', height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
