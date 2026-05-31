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

  // 🌟 ИСПРАВЛЕНО: Объявление переведено на async function для автоподнятия (hoisting)
  // 🌟 1. ФУНКЦИЯ ГЛОССАРИЯ (С АВТОПОДНЯТИЕМ И ПАКЕТНОЙ ТРАНЗАКЦИЕЙ)
  async function syncGlossary() {
    try {
      console.log('📖 [Sync] Starting glossary synchronization with PostgreSQL...');
      const res = await apiClient.get('/api/glossary');
      if (res.data.success && Array.isArray(res.data.glossary)) {
        const cloudGlossary = res.data.glossary;
        db.runSync('BEGIN TRANSACTION;');
        try {
          db.runSync('DELETE FROM glossary;');
          cloudGlossary.forEach(item => {
            db.runSync(
              'INSERT OR REPLACE INTO glossary (term, definition, subject_key) VALUES (?, ?, ?);',
              [item.term, item.definition, item.subject_key]
            );
          });
          db.runSync('COMMIT;');
          console.log('✅ [Sync] Glossary bundled and synced successfully via Transaction!');
        } catch (innerErr) {
          db.runSync('ROLLBACK;');
          console.log('❌ Сбой записи глоссария в SQLite:', innerErr.message);
        }
      }
    } catch (e) {
      console.log("⚠️ [Sync] Glossary offline mode active.");
    }
  }

  // 🌟 2. ФУНКЦИЯ КУРСОВ И КАТАЛОГА
  async function syncCourses() {
    try {
      console.log('🔄 [Sync] Starting courses synchronization with PostgreSQL...');
      const res = await apiClient.get('/api/courses');
      if (res.data.success && res.data.categories) {
        db.runSync('DELETE FROM courses');
        res.data.categories.forEach(category => {
          if (category.subjects && Array.isArray(category.subjects)) {
            category.subjects.forEach(course => {
              db.runSync(
                'INSERT OR REPLACE INTO courses (id, title, subject_key) VALUES (?, ?, ?)',
                [course.id, course.title, course.subject_key]
              );
            });
          }
        });
        console.log('✅ [Sync] Courses synced successfully (PostgreSQL -> SQLite).');
      }
    } catch (e) {
      console.log("⚠️ [Sync] Courses offline mode active:", e.message);
    }
  }

  // 🌟 3. ИСПРАВЛЕННАЯ МОНОЛИТНАЯ ФУНКЦИЯ ЛЕКЦИЙ И ТЕМ (БЕЗ ДУБЛИКАТОВ)
  async function syncTopics() {
    try {
      console.log('🔄 [Sync] Starting topics synchronization with PostgreSQL...');
      const res = await apiClient.get('/api/topics');
      if (res.data.success) {
        const cloudTopics = res.data.topics || [];
        db.runSync('DELETE FROM topics');
        cloudTopics.forEach(topic => {
          db.runSync(
            `INSERT OR REPLACE INTO topics 
            (id, subject_key, title, description, content, quiz_question, quiz_answer, difficulty) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              topic.id,
              topic.subject_key,
              topic.title,
              topic.description || '',
              topic.content || '',
              topic.quiz_question || '',
              topic.quiz_answer || '',
              topic.difficulty || 1
            ]
          );
        });
        console.log('✅ [Sync] Topics and Lectures synced successfully!');
      }
    } catch (e) {
      console.log("⚠️ [Sync] Topics offline mode active:", e.message);
    }
  }


  // 🌟 3. ГЛОБАЛЬНЫЙ ТРИГГЕР ИНИЦИАЛИЗАЦИИ ПРИ СТАРТЕ ПРИЛОЖЕНИЯ
  useEffect(() => {
    async function init() {
      try {
        await dbService.init();
        const savedTheme = await AsyncStorage.getItem('user_theme');
        if (savedTheme) setIsDarkMode(savedTheme === 'dark');

        // Запускаем каскадную синхронизацию контента
        syncGlossary();
        await syncCourses(); // Сначала скачиваем курсы
        await syncTopics();  // Затем скачиваем темы лекций

        const token = await SecureStore.getItemAsync('user_token');
        if (token) {
          const res = await apiClient.get('/api/profile').catch(() => null);
          if (res?.data?.success && res.data.user) {
            const fetchedUser = Array.isArray(res.data.user) ? res.data.user[0] : res.data.user;
            setUser(fetchedUser);
            setIsLoggedIn(true);
            setStreak(fetchedUser.streak_count || 0);

            // 🌟 ИСПРАВЛЕНО: Каскадный запуск оффлайн-синхронизации с контролем потоков данных (await)
            if (Platform.OS !== 'web') {
              await syncProgress(fetchedUser.username); // 🌟 ИСПРАВЛЕНО: Передали fetchedUser!
            }
            await syncCourses();  // Синхронизируем структуру предметов (нашу Базовую математику!)
            await syncTopics();   // Скачиваем актуальные тексты лекций и квизов
            syncGlossary();       // Обновляем базу знаний глоссария в фоновом режиме

            return { success: true };

          }
        }
      } catch (e) {
        console.log('❌ [Init] Ошибка инициализации:', e);
      } finally {
        setIsLoading(false);
      }
    }

    init();

    // 💡 Слушаем событие разлогина из api.js внутри тела хука useEffect!
    const subscription = DeviceEventEmitter.addListener('FORCE_LOGOUT', () => {
      logout();
    });

    // Чистим слушатель при размонтировании компонента, чтобы не было утечек памяти
    return () => subscription.remove();
  }, []);


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
      console.log('❌ Сбой метода login:', error.message);
      
      // 🌟 ИСПРАВЛЕНО: Защита от кракозябр. Вытаскиваем точечное сообщение от сервера
      let serverMessage = 'Не удалось связаться с сервером базы данных.';
      
      if (error.response?.data?.error) {
        serverMessage = error.response.data.error;
      } else if (error.response?.status === 401) {
        serverMessage = 'Неверный пароль или учетная запись не существует.';
      } else if (error.response?.status === 444) {
        serverMessage = 'Пользователь с таким Email не найден.';
      }

      // Переводим сообщения на понятный русский язык, если бэкенд вернул сырой текст
      if (serverMessage.includes('password')) serverMessage = 'Неверный пароль. Пожалуйста, попробуйте еще раз.';
      if (serverMessage.includes('email') || serverMessage.includes('user')) serverMessage = 'Пользователь с таким Email не зарегистрирован.';

      return {
        success: false,
        error: serverMessage
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
const completeTopic = async (username, topicKey, topicId) => {
  const finalKey = topicKey || `topic_${topicId}`;
  dbService.completeTopic(username, finalKey);

  // 🌟 ИВТ-АЛГОРИТМ: Расчет и удержание ударного режима (Streak) по датам
  try {
    const todayStr = new Date().toISOString().split('T')[0]; // Генерируем строку '2026-05-31'
    const lastActiveDate = await AsyncStorage.getItem(`last_active_${username}`);
    
    if (lastActiveDate !== todayStr) {
      let newStreak = streak;
      
      if (lastActiveDate) {
        const lastDate = new Date(lastActiveDate);
        const todayDate = new Date(todayStr);
        const diffTime = Math.abs(todayDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Пользователь занимался вчера -> Streak продлен!
          newStreak = streak + 1;
        } else if (diffDays > 1) {
          // Пользователь пропустил день -> Сброс
          newStreak = 1;
        }
      } else {
        // Первый заход и первый пройденный тест
        newStreak = 1;
      }

      setStreak(newStreak);
      await AsyncStorage.setItem(`last_active_${username}`, todayStr);
      
      // Кэшируем новый стрик в локальную SQLite
      db.runSync('UPDATE users SET streak_count = ? WHERE username = ?;', [newStreak, username]);
    }
  } catch (streakErr) {
    console.log('⚠️ Ошибка расчета ударного режима:', streakErr.message);
  }

  // Отправляем прогресс на сервер PostgreSQL и забираем монеты
  apiClient.post('/api/progress', { topic_id: topicId })
    .then((res) => {
      if (res.data.success && res.data.reward) {
        setUser(prev => prev ? { ...prev, balance: (prev.balance || 0) + res.data.reward } : null);
      }
    })
    .catch((e) => console.log('❌ Ошибка отправки прогресса на бэкенд:', e.message));

  setCompletedCourses(prev => {
    const currentList = Array.isArray(prev) ? prev : [];
    const updated = [...new Set([...currentList, finalKey])];
    const currentXP = (user?.balance || 0) + 50;
    const award = checkAchievementTriggers(updated.length, streak, currentXP);
    if (award) triggerAchievementPopUp(award);
    return updated;
  });
};

  // --- КОНЕЦ ИСПРАВЛЕННОГО БЛОКА ---


  return (
    <AuthContext.Provider value={{
      user, isLoggedIn, isDarkMode, streak, isLoading,
      nickname: user?.username, userRole: user?.role, calculateLevel,
      login, register, logout, deleteUserAccount,
      completedCourses, setCompletedCourses, activeBorder, setActiveBorder, setUser, syncCourses, syncTopics,
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
