import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient, { tokenStorage } from '../services/api';
import { profileService } from '../services/api';
import { dbService } from '../services/database';
import { db } from '../services/db';

export const AuthContext = createContext();
export const CoursesContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]                     = useState(null);
  const [isLoggedIn, setIsLoggedIn]         = useState(false);
  const [isDarkMode, setIsDarkMode]         = useState(false);
  const [streak, setStreak]                 = useState(0);
  const [isLoading, setIsLoading]           = useState(true);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [activeBorder, setActiveBorder]     = useState('none');

  // в”Ђв”Ђв”Ђ Achievement popup в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const [achievementModal, setAchievementModal] = useState(false);
  const [unlockedAward, setUnlockedAward]   = useState(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const checkAchievementTriggers = useCallback((previousLectures, lecturesCount, previousStreak, currentStreak, previousXP, currentXP) => {
    if (previousLectures < 1 && lecturesCount >= 1) return { title: 'Первая волна', icon: 'water', color: '#4A90E2' };
    if (previousLectures < 5 && lecturesCount >= 5) return { title: 'Магистр знаний', icon: 'medal', color: '#9B59B6' };
    if (previousStreak < 3 && currentStreak >= 3) return { title: 'В ударе', icon: 'flame', color: '#FF5E5E' };
    if (previousXP < 500 && currentXP >= 500) return { title: 'Золотой запас', icon: 'trophy', color: '#F1C40F' };
    return null;
  }, []);

  const triggerAchievementPopUp = (award) => {
    setUnlockedAward(award);
    setAchievementModal(true);
    Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  // в”Ђв”Ђв”Ђ РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ: РїСЂРѕРіСЂРµСЃСЃ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const syncProgress = useCallback(async (nickname) => {
    try {
      const res = await apiClient.get('/api/progress');
      if (res.data.success) {
        const cloudCompleted = res.data.completed || [];
        const formattedKeys = cloudCompleted.map(item => {
          if (typeof item === 'object') {
            return item.subject_key ? `${item.subject_key}_${item.topic_id}` : `topic_${item.topic_id}`;
          }
          return `topic_${item}`;
        });
        if (Platform.OS !== 'web') {
          formattedKeys.forEach(topicKey => dbService.completeTopic(nickname, topicKey.replace('topic_', '')));
        }
        setCompletedCourses(formattedKeys);
      }
    } catch {
      // РћС„Р»Р°Р№РЅ вЂ” С‡РёС‚Р°РµРј РёР· SQLite
      if (Platform.OS !== 'web') {
        try {
          const done = db.getAllSync(
            "SELECT topic_key FROM user_progress WHERE username = ? AND status = 'completed'",
            [nickname]
          );
          setCompletedCourses(done.map(row => row.topic_key));
        } catch {
          setCompletedCourses([]);
        }
      }
    }
  }, []);

  // в”Ђв”Ђв”Ђ РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ: РіР»РѕСЃСЃР°СЂРёР№ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  async function syncGlossary() {
    if (Platform.OS === 'web') return;
    try {
      const res = await apiClient.get('/api/glossary');
      if (res.data.success && Array.isArray(res.data.glossary)) {
        db.runSync('BEGIN TRANSACTION;');
        try {
          db.runSync('DELETE FROM glossary;');
          res.data.glossary.forEach(item => {
            db.runSync(
              'INSERT OR REPLACE INTO glossary (term, definition, subject_key) VALUES (?, ?, ?);',
              [item.term, item.definition, item.subject_key]
            );
          });
          db.runSync('COMMIT;');
        } catch (inner) {
          db.runSync('ROLLBACK;');
          console.log('вљ пёЏ [Sync] Glossary SQLite error:', inner.message);
        }
      }
    } catch {
      console.log('рџ“ґ [Sync] Glossary offline mode.');
    }
  }

  // в”Ђв”Ђв”Ђ РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ: РєСѓСЂСЃС‹ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  async function syncCourses() {
    if (Platform.OS === 'web') return;
    try {
      const res = await apiClient.get('/api/courses');
      if (res.data.success && res.data.categories) {
        db.runSync('DELETE FROM courses');
        res.data.categories.forEach(category => {
          (category.subjects || []).forEach(course => {
            db.runSync(
              'INSERT OR REPLACE INTO courses (id, title, subject_key) VALUES (?, ?, ?)',
              [course.id, course.title, course.subject_key]
            );
          });
        });
      }
    } catch {
      console.log('рџ“ґ [Sync] Courses offline mode.');
    }
  }

  // в”Ђв”Ђв”Ђ РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ: С‚РµРјС‹ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  async function syncTopics() {
    if (Platform.OS === 'web') return;
    try {
      const res = await apiClient.get('/api/topics');
      if (res.data.success) {
        const cloudTopics = res.data.topics || [];
        db.runSync('DELETE FROM topics');
        cloudTopics.forEach(topic => {
          db.runSync(
            `INSERT OR REPLACE INTO topics
              (id, subject_key, title, description, content, quiz_question, quiz_answer, difficulty)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [topic.id, topic.subject_key, topic.title, topic.description || '',
             topic.content || '', topic.quiz_question || '', topic.quiz_answer || '', topic.difficulty || 1]
          );
        });
      }
    } catch {
      console.log('рџ“ґ [Sync] Topics offline mode.');
    }
  }

  // в”Ђв”Ђв”Ђ РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ РїСЂРёР»РѕР¶РµРЅРёСЏ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  useEffect(() => {
    async function init() {
      try {
        // SQLite init С‚РѕР»СЊРєРѕ РЅР° РЅР°С‚РёРІРµ
        if (Platform.OS !== 'web') {
          await dbService.init();
        }

        const savedTheme = await AsyncStorage.getItem('user_theme');
        if (savedTheme) setIsDarkMode(savedTheme === 'dark');

        // РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РєРѕРЅС‚РµРЅС‚Р° (РЅРµ Р±Р»РѕРєРёСЂСѓРµС‚ Р·Р°РіСЂСѓР·РєСѓ)
        syncGlossary();
        syncCourses();
        syncTopics();

        const token = await tokenStorage.get('user_token');
        if (token) {
          const res = await apiClient.get('/api/profile').catch(() => null);
          if (res?.data?.success && res.data.user) {
            const fetchedUser = Array.isArray(res.data.user) ? res.data.user[0] : res.data.user;
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(fetchedUser);
            setIsLoggedIn(true);
            setStreak(fetchedUser.streak_count || 0);

            // Р—Р°РіСЂСѓР¶Р°РµРј border РёР· AsyncStorage
            const fetchedOwnerKey = fetchedUser.id || fetchedUser.email || fetchedUser.username;
            const savedBorder = await AsyncStorage.getItem(`border_${fetchedOwnerKey}`);
            setActiveBorder(savedBorder || 'none');

            await syncProgress(fetchedUser.email || String(fetchedUser.id) || fetchedUser.username);
          }
        }
      } catch (e) {
        console.log('вќЊ [Init] Error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();

    // РџРѕРґРїРёСЃРєР° РЅР° РїСЂРёРЅСѓРґРёС‚РµР»СЊРЅС‹Р№ Р»РѕРіР°СѓС‚
    let subscription;
    if (Platform.OS !== 'web') {
      const { DeviceEventEmitter } = require('react-native');
      subscription = DeviceEventEmitter.addListener('FORCE_LOGOUT', () => logout());
    } else {
      const handler = () => logout();
      window.addEventListener('FORCE_LOGOUT', handler);
      return () => window.removeEventListener('FORCE_LOGOUT', handler);
    }
    return () => subscription?.remove();
  }, []);

  // в”Ђв”Ђв”Ђ РЈСЂРѕРІРµРЅСЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const calculateLevel = (totalXp) => {
    const xp = totalXp || 0;
    const xpPerLevel = 100;
    const level = Math.floor(xp / xpPerLevel) + 1;
    const xpInCurrentLevel = xp % xpPerLevel;
    return { level, xpInCurrentLevel, progress: xpInCurrentLevel / xpPerLevel, xpRemaining: xpPerLevel - xpInCurrentLevel, xpPerLevel };
  };

  // в”Ђв”Ђв”Ђ Р›РѕРіРёРЅ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/api/login', { email, password });
      if (response.data.success) {
        const { token, user: userData } = response.data;

        await tokenStorage.set('user_token', token);
        await AsyncStorage.setItem('current_user', userData.username);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // РљСЌС€ РІ SQLite (С‚РѕР»СЊРєРѕ РЅР°С‚РёРІРµ)
        if (Platform.OS !== 'web') {
          try {
            db.runSync(
              'INSERT OR REPLACE INTO users (email, username, password, role, balance, streak_count) VALUES (?, ?, ?, ?, ?, ?);',
              [email.toLowerCase().trim(), userData.username, 'auth_session',
               userData.role || 'student', userData.balance || 0, userData.streak_count || 0]
            );
          } catch (sqliteErr) {
            console.log('вљ пёЏ [SQLite Cache]:', sqliteErr.message);
          }
        }

        const ownerKey = userData.id || userData.email || userData.username;
        const savedBorder = await AsyncStorage.getItem(`border_${ownerKey}`);
        setActiveBorder(savedBorder || 'none');
        setUser(userData);
        setIsLoggedIn(true);
        setStreak(userData.streak_count || 0);

        syncProgress(userData.email || String(userData.id) || userData.username);
        syncGlossary();
        syncTopics();

        return { success: true };
      }
    } catch (error) {
      let serverMessage = 'Не удалось войти. Проверьте email и пароль.';
      if (error.response?.status === 401 || error.response?.status === 400) {
        serverMessage = 'Неверный email или пароль.';
      } else if (!error.response) {
        serverMessage = 'Не удалось связаться с сервером.';
      }
      return { success: false, error: serverMessage };
    }
  };

  // в”Ђв”Ђв”Ђ Р РµРіРёСЃС‚СЂР°С†РёСЏ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const register = async (email, username, password) => {
    try {
      const res = await apiClient.post('/api/register', { email, username, password });
      if (res.data.success) return await login(email, password);
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Ошибка регистрации.' };
    }
  };

  // в”Ђв”Ђв”Ђ Р›РѕРіР°СѓС‚ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const logout = async () => {
    await tokenStorage.delete('user_token');
    await AsyncStorage.removeItem('current_user');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setIsLoggedIn(false);
    setCompletedCourses([]);
    setStreak(0);
    setActiveBorder('none');
  };

  // в”Ђв”Ђв”Ђ РЈРґР°Р»РµРЅРёРµ Р°РєРєР°СѓРЅС‚Р° в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const deleteUserAccount = async (password) => {
    try {
      const currentUserNickname = user?.username;
      const response = await profileService.deleteAccount(password);
      if (response.data.success) {
        if (currentUserNickname && Platform.OS !== 'web') {
          await dbService.clearUserData(currentUserNickname);
        }
        await tokenStorage.delete('user_token');
        await AsyncStorage.removeItem('current_user');
        if (currentUserNickname) await AsyncStorage.removeItem(`avatar_${currentUserNickname}`);
        setUser(null);
        setIsLoggedIn(false);
        setCompletedCourses([]);
        setStreak(0);
        setActiveBorder('none');
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Ошибка удаления аккаунта.' };
    }
  };

  const updateUserName = async (newUsername) => {
    const trimmedName = String(newUsername || '').trim();
    if (trimmedName.length < 3) return { success: false, error: 'Имя должно быть не короче 3 символов.' };
    try {
      const response = await profileService.updateName(trimmedName);
      if (response.data?.success && response.data.user) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        await AsyncStorage.setItem('current_user', updatedUser.username);
        if (Platform.OS !== 'web') {
          try {
            db.runSync('UPDATE users SET username = ? WHERE email = ? OR server_id = ? OR id = ?;', [
              updatedUser.username,
              updatedUser.email,
              updatedUser.id,
              updatedUser.id,
            ]);
          } catch {}
        }
        return { success: true, user: updatedUser };
      }
      return { success: false, error: 'Не удалось обновить имя.' };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Не удалось обновить имя.' };
    }
  };

  // в”Ђв”Ђв”Ђ РџРѕРєСѓРїРєР° СЂР°РјРєРё РїСЂРѕС„РёР»СЏ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const buyInterfaceBorder = async (borderId, cost) => {
    if (!user) return { success: false, error: 'Пользователь не найден.' };
    try {
      const ownerKey = user.id || user.email || user.username;
      const ownedKey = `border_owned_${ownerKey}_${borderId}`;
      const borderKey = `border_${ownerKey}`;
      const alreadyOwned = await AsyncStorage.getItem(ownedKey);
      if (alreadyOwned === 'true') {
        setActiveBorder(borderId);
        await AsyncStorage.setItem(borderKey, borderId);
        return { success: true, alreadyOwned: true };
      }

      const inventoryRes = await apiClient.get('/api/shop/inventory').catch(() => null);
      const serverOwns = Array.isArray(inventoryRes?.data?.items) && inventoryRes.data.items.some(item =>
        item.item_type === 'frame' && item.item_value === `${borderId}_frame`
      );
      if (serverOwns) {
        setActiveBorder(borderId);
        await AsyncStorage.setItem(borderKey, borderId);
        await AsyncStorage.setItem(ownedKey, 'true');
        return { success: true, alreadyOwned: true };
      }

      if (user.balance < cost) return { success: false, error: 'Недостаточно монет.' };

      const response = await apiClient.post('/api/shop/buy', {
        item_type: 'frame',
        item_value: `${borderId}_frame`,
        price: cost,
      });
      if (response.data.success) {
        const newBalance = response.data.newBalance ?? ((user.balance || 0) - cost);
        setUser(prev => prev ? { ...prev, balance: newBalance } : null);
        setActiveBorder(borderId);
        await AsyncStorage.setItem(borderKey, borderId);
        await AsyncStorage.setItem(ownedKey, 'true');
        if (Platform.OS !== 'web') {
          try {
            db.runSync('UPDATE users SET balance = ? WHERE username = ?;', [newBalance, user.username]);
          } catch {}
        }
        return { success: true };
      }
      return { success: false, error: 'Ошибка сервера.' };
    } catch (err) {
      return { success: false, error: 'Нет соединения.' };
    }
  };

  // в”Ђв”Ђв”Ђ Р—Р°РІРµСЂС€РµРЅРёРµ С‚РµРјС‹ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const completeTopic = async (accountKey, topicKey, topicId) => {
    const numericId = topicId || parseInt((topicKey || '').replace('topic_', ''), 10);
    const finalKey = topicKey || `topic_${numericId}`;

    if (Platform.OS !== 'web') {
      dbService.completeTopic(accountKey, numericId);
    }

    apiClient.post('/api/progress', { topic_id: numericId })
      .then((res) => {
        if (res.data.success && res.data.reward) {
          setUser(prev => prev ? { ...prev, balance: (prev.balance || 0) + res.data.reward } : null);
        }
      })
      .catch(e => console.log('вљ пёЏ [Progress API]:', e.message));

    setCompletedCourses(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      const updated = [...new Set([...currentList, finalKey])];
      const previousXP = user?.balance || 0;
      const currentXP = previousXP + 50;
      const award = checkAchievementTriggers(currentList.length, updated.length, streak || 0, streak || 0, previousXP, currentXP);
      if (award) triggerAchievementPopUp(award);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{
      user, isLoggedIn, isDarkMode, streak, isLoading,
      nickname: user?.username,
      userRole: user?.role,
      calculateLevel,
      login, register, logout, deleteUserAccount, buyInterfaceBorder,
      updateUserName,
      completedCourses, setCompletedCourses,
      activeBorder, setActiveBorder,
      setUser,
      syncCourses, syncTopics,
      toggleTheme: async () => {
        const n = !isDarkMode;
        setIsDarkMode(n);
        await AsyncStorage.setItem('user_theme', n ? 'dark' : 'light');
      },
      completeTopic,
      getCompletedTopics: dbService.getCompletedTopics,
      getAchievements: dbService.getAchievements,
      toggleBookmark: dbService.toggleBookmark,
      getLeaderboard: dbService.getLeaderboard,
      executeRaw: (q, p) => Platform.OS !== 'web' ? db.getAllSync(q, p) : [],
    }}>
      <CoursesContext.Provider value={{ completedCourses, setCompletedCourses }}>
        {children}

        {/* Achievement popup */}
        <Modal visible={achievementModal} transparent animationType="fade">
          <View style={popupStyles.overlay}>
            <Animated.View style={[popupStyles.box, { transform: [{ scale: scaleAnim }] }]}>
              <View style={[popupStyles.iconRing, { backgroundColor: (unlockedAward?.color || '#F1C40F') + '20' }]}>
                <Ionicons name={unlockedAward?.icon || 'trophy'} size={44} color={unlockedAward?.color || '#F1C40F'} />
              </View>
              <Text style={popupStyles.title}>ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО!</Text>
              <Text style={popupStyles.name}>{unlockedAward?.title}</Text>
              <Text style={popupStyles.sub}>Отличный прогресс. Продолжайте проходить темы и открывать новые достижения.</Text>
              <TouchableOpacity
                style={[popupStyles.btn, { backgroundColor: unlockedAward?.color || '#4A90E2' }]}
                onPress={() => { scaleAnim.setValue(0); setAchievementModal(false); }}
              >
                <Text style={popupStyles.btnText}>Отлично!</Text>
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
  box: { backgroundColor: '#FFF', borderRadius: 32, padding: 30, alignItems: 'center', width: '100%', maxWidth: 340 },
  iconRing: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 13, fontWeight: '900', color: '#A0AEC0', letterSpacing: 1, marginBottom: 6 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1A202C', marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 12, color: '#718096', textAlign: 'center', lineHeight: 18, marginBottom: 25, paddingHorizontal: 10 },
  btn: { width: '100%', height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});


