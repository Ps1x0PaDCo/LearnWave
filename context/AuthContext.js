import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient, { profileService } from '../services/api';
import { dbService } from '../services/database';
import { db } from '../services/db';

export const AuthContext = createContext();
export const CoursesContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [streak, setStreak] = useState(0);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Состояния для всплывающего Pop-up уведомления достижений
  const [achievementModal, setAchievementModal] = useState(false);
  const [unlockedAward, setUnlockedAward] = useState(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Краткий справочник условий для триггера всплывающего окна
  const checkAchievementTriggers = useCallback((lecturesCount, currentStreak, currentXP) => {
    if (lecturesCount === 1) return { title: 'Первая волна', icon: 'water', color: '#4A90E2' };
    if (lecturesCount === 5) return { title: 'Магистр знаний', icon: 'medal', color: '#9B59B6' };
    if (currentStreak === 3) return { title: 'В ударе', icon: 'flame', color: '#FF5E5E' };
    if (currentXP >= 500) return { title: 'Золотой запас', icon: 'trophy', color: '#F1C40F' };
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

//Синхронизация прогресса
 const syncProgress = useCallback(async (nickname) => {
    try {
      // ИСПРАВЛЕНО: Лог на английском, чтобы Windows терминал не выдавал ромбики
      console.log('?? [Sync] Starting progress synchronization with PostgreSQL...');
      const res = await apiClient.get('/api/progress');
      if (res.data.success) {
        const cloudCompleted = res.data.completed;
        cloudCompleted.forEach(t => dbService.completeTopic(nickname, t));
        setCompletedCourses(cloudCompleted);
        console.log('? [Sync] Databases synced successfully (PostgreSQL -> SQLite).');
      }
    } catch (e) {
      console.log("?? [Sync] Offline mode activated. Loading local progress from SQLite.");
      const local = dbService.getCompletedTopics(nickname);
      setCompletedCourses(local || []);
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

  useEffect(() => {
    async function init() {
      try {
        await dbService.init();
        const savedTheme = await AsyncStorage.getItem('user_theme');
        if (savedTheme) setIsDarkMode(savedTheme === 'dark');

        // Запускаем синхронизацию справочника формул при старте приложения
        await syncGlossary();

               // --- (АВТО-ВХОД) ---
        const token = await SecureStore.getItemAsync('user_token');
        if (token) {
          const res = await apiClient.get('/api/profile').catch(() => null);
          
          if (res?.data?.success && res.data.user && res.data.user.length > 0) {
            const fetchedUser = res.data.user[0]; // Берем первый объект из массива rows
            
            setUser(fetchedUser);
            setIsLoggedIn(true);
            setStreak(fetchedUser.streak_count || 0);
            
            // Синхронизируем данные только после успешной проверки профиля
            await syncProgress(fetchedUser.username);
            await syncGlossary();
          } else {
            // Если токен устарел или удален на сервере, чистим память устройства
            await SecureStore.deleteItemAsync('user_token');
          }
        }

      } catch (e) { 
        console.log('? [Init] Ошибка инициализации:', e); 
      } finally { 
        setIsLoading(false); 
      }
    }
    init();
  }, [syncProgress, syncGlossary]); // Добавили syncGlossary в зависимости

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/api/login', { email, password });
      if (response.data.success) {
        const { token, user: userData } = response.data;
        await SecureStore.setItemAsync('user_token', token);
        await AsyncStorage.setItem('current_user', userData.username);
        
        setUser(userData);
        setIsLoggedIn(true);
        setStreak(userData.streak_count || 0);
        
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Неверный логин или пароль' };
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


  // --- НАЧАЛО ПРАВКИ 3 (НАЧИСЛЕНИЕ МОНЕТ НА КЛИЕНТЕ) ---
  const completeTopic = (u, t, id) => {
    dbService.completeTopic(u, t);
    
    // Отправляем прогресс на сервер и сразу забираем награду в стейт
    apiClient.post('/api/progress', { topic_id: id })
      .then((res) => {
        if (res.data.success && res.data.reward) {
          // Обновляем баланс в оперативной памяти приложения без перезагрузки
          setUser(prev => prev ? { ...prev, balance: (prev.balance || 0) + res.data.reward } : null);
        }
      })
      .catch((e) => console.log('Ошибка отправки прогресса на бэкенд:', e.message));

    setCompletedCourses(prev => {
      const updated = [...new Set([...prev, t])];
      const currentXP = (user?.balance || 0) + 50; 
      const award = checkAchievementTriggers(updated.length, streak, currentXP);
      
      if (award) triggerAchievementPopUp(award);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{
      user, isLoggedIn, isDarkMode, streak, isLoading, 
      nickname: user?.username, userRole: user?.role,
      login, register, logout, deleteUserAccount,
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
                <Text style={popupStyles.btnText}>Отлично ??</Text>
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
