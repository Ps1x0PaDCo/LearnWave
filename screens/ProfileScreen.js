import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, StatusBar, Platform, ActivityIndicator, Modal, TextInput, Animated, Easing
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { dbService } from '../services/database';
import apiClient from '../services/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Haptics: безопасная обёртка (не падает на вебе) ─────────────────────────
const haptic = {
  impact: (style) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.impactAsync(style); } },
  notification: (type) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.notificationAsync(type); } },
};


const AVATAR_DATA = {
  //  Старые талисманы
  '🦉': { label: 'Мудрость', desc: 'Символ глубоких академических знаний.' },
  '🦊': { label: 'Остроумие', desc: 'Признак хитрости и гибкого алгоритмического ума.' },
  '🐱': { label: 'Независимость', desc: 'Любопытство в поиске нестандартных решений.' },
  '🐼': { label: 'Выдержка', desc: 'Спокойствие и хладнокровие при дебаге сложного кода.' },
  '🦁': { label: 'Лидерство', desc: 'Сила воли, целеустремленность и стремление к цели.' },

  //   НОВЫЕ ТАЛИСМАНЫ 
  '🦈': { label: 'Акула кода', desc: 'Агрессивное и стремительное решение архитектурных задач.' },
  '🐲': { label: 'Дракон компиляции', desc: 'Огненная страсть к созданию высокопроизводительных систем.' },
  '🦫': { label: 'Бобёр-архитектор', desc: 'Методичное и надежное проектирование баз данных.' },
  '🦅': { label: 'Орлиный взор', desc: 'Филигранный поиск багов и уязвимостей в исходном коде.' },
  '🤖': { label: 'Сингулярность', desc: 'Полное слияние разума с искусственным интеллектом.' }
};

const BORDER_OPTIONS = [
  { id: 'none', label: 'Без рамки', color: '#8A99A6', owned: true, animated: false },
  { id: 'bronze', label: 'Бронзовое свечение', color: '#CD7F32', animated: false },
  { id: 'gold', label: 'Магистр золота', color: '#FFD700', animated: false },
  { id: 'platinum', label: 'Платиновый контур', color: '#E5E4E2', animated: false },
  { id: 'neon', label: 'Пульсирующий неон', color: '#FF0055', animated: true },
  { id: 'matrix', label: 'Матричный код', color: '#00FF41', animated: true },
  { id: 'sapphire', label: 'Сапфировая рамка', color: '#2F80ED', animated: true },
  { id: 'emerald', label: 'Изумрудная рамка', color: '#10B981', animated: true },
  { id: 'sunset', label: 'Закатный градиент', color: '#FF7A45', animated: true },
];

const STATIC_BORDER_COLORS = {
  bronze: '#CD7F32',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

const BORDER_LABELS = {
  none: 'Без рамки',
  bronze: 'Бронза',
  gold: 'Золото',
  platinum: 'Платина',
  neon: 'Неон',
  matrix: 'Матрица',
  sapphire: 'Сапфир',
  emerald: 'Изумруд',
  sunset: 'Закат',
};

const PULSE_BORDER_COLORS = {
  sapphire: ['#2F80ED', '#56CCF2'],
  emerald: ['#10B981', '#6EE7B7'],
  sunset: ['#FF7A45', '#9B59B6'],
};


const ProfileScreen = ({ navigation }) => {
  const {
    nickname, isDarkMode, toggleTheme, logout, updateUserName,
    getCompletedTopics, getAchievements, user,
    deleteUserAccount, calculateLevel, activeBorder,
    setActiveBorder, buyInterfaceBorder, completedCourses,
  } = useContext(AuthContext);

  const { level, xpInCurrentLevel, progress, xpRemaining, xpPerLevel } = calculateLevel(user?.balance || 0);

  const colors = getThemeColors(isDarkMode);

  /*Хук*/
  const [selectedAvatar, setSelectedAvatar] = useState('🦉');
  const [stats, setStats] = useState({ completed: [], awards: [] });
  const [loading, setLoading] = useState(false);
  // Состояния для модалки безопасного удаления аккаунта
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  // 💡 Состояния для новых модалок кастомизации
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [borderModalVisible, setBorderModalVisible] = useState(false);
  const [ownedBorders, setOwnedBorders] = useState({ none: true });

  // 🌟 ЖЕСТКАЯ ФИКСАЦИЯ АНИМАЦИЙ В ПАМЯТИ (ИВТ-ОПТИМИЗАЦИЯ СВЯЗЕЙ)
  const neonAnim = useRef(new Animated.Value(0.4)).current;
  const matrixScroll = useRef(new Animated.Value(0)).current;
  const borderPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeBorder !== 'neon') return undefined;

    neonAnim.setValue(0.4);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(neonAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(neonAnim, { toValue: 0.4, duration: 1200, useNativeDriver: false })
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [activeBorder, neonAnim]);

  useEffect(() => {
    if (activeBorder !== 'matrix') return undefined;

    matrixScroll.setValue(0);
    const animation = Animated.loop(
      Animated.timing(matrixScroll, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [activeBorder, matrixScroll]);

  useEffect(() => {
    if (!PULSE_BORDER_COLORS[activeBorder]) return undefined;

    borderPulse.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(borderPulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(borderPulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [activeBorder, borderPulse]);



  useEffect(() => {
    const loadSavedBorder = async () => {
      if (nickname) {
        const ownerKey = user?.id || user?.email || nickname;
        const savedBorder = await AsyncStorage.getItem(`border_${ownerKey}`);
        setActiveBorder(savedBorder || 'none');

        let serverOwned = {};
        try {
          const inventoryRes = await apiClient.get('/shop/inventory');
          if (Array.isArray(inventoryRes?.data?.items)) {
            inventoryRes.data.items
              .filter(item => item.item_type === 'frame')
              .forEach(item => {
                const borderId = String(item.item_value || '').replace('_frame', '');
                if (borderId) serverOwned[borderId] = true;
              });
          }
        } catch {}

        const ownedPairs = await Promise.all(
          BORDER_OPTIONS
            .filter(item => item.id !== 'none')
            .map(async item => [item.id, await AsyncStorage.getItem(`border_owned_${ownerKey}_${item.id}`)])
        );
        const localOwned = Object.fromEntries(
          ownedPairs
            .filter(([, value]) => value === 'true')
            .map(([id]) => [id, true])
        );
        setOwnedBorders({
          none: true,
          ...localOwned,
          ...serverOwned,
        });
      }
    };
    loadSavedBorder();
  }, [nickname, user?.id, user?.email, borderModalVisible]);

  // Состояния для модалки редактирования
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [tempNickname, setTempNickname] = useState('');


  // 🌟 ИСПРАВЛЕНО: Реактивный подсчет статистики напрямую из стейта контекста и SQLite
  useEffect(() => {
    const refreshData = async () => {
      if (nickname) {
        // 1. Считываем аватарку из кэша Android
        const saved = await AsyncStorage.getItem(`avatar_${nickname}`);
        if (saved) setSelectedAvatar(saved);
        setTempNickname(nickname);

        try {
          // 2. Считываем количество уникальных полученных наград из локальной SQLite таблицы
          const { db } = require('../services/db'); // Безопасный вызов СУБД
          const awardsResult = db.getAllSync(
            "SELECT id FROM user_progress WHERE username = ? AND status = 'completed'", 
            [nickname]
          );
          
          setStats({ 
            // Пройденные лекции берем прямо из живого массива контекста (гарантия автообновления!)
            completed: completedCourses || [], 
            awards: awardsResult || [] 
          });
        } catch (sqliteErr) {
          console.log('⚠️ Ошибка подсчета оффлайн-наград в профиле:', sqliteErr.message);
          setStats({ completed: completedCourses || [], awards: [] });
        }
      }
    };
    
    refreshData();
  }, [nickname, completedCourses]); // Добавили completedCourses в зависимости, чтобы цифры менялись на лету!

  const saveNewNickname = async () => {
    const trimmedName = tempNickname.trim();
    if (trimmedName.length >= 3) {
      if (trimmedName === nickname) {
        setEditModalVisible(false);
        return;
      }
      setLoading(true);
      try {
        const result = await dbService.updateNickname(nickname, trimmedName);
        if (result.success) {
          updateUserName(trimmedName);
          haptic.notification('medium');
          setEditModalVisible(false);
        } else {
          Alert.alert("Ошибка", result.error);
        }
      } catch (e) {
        Alert.alert("Ошибка", "Не удалось обновить имя");
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert("Ошибка", "Никнейм должен быть не короче 3 символов");
    }
  };
  // Функция-триггер для безопасного каскадного удаления аккаунта
  const handleConfirmDelete = async () => {
    const passwordToSend = confirmPassword.trim();
    if (!passwordToSend) {
      Alert.alert("Ошибка", "Пожалуйста, введите ваш текущий пароль.");
      return;
    }

    setLoading(true);
    try {
      // Вызываем наш безопасный метод из AuthContext
      const result = await deleteUserAccount(passwordToSend);

      if (result && result.success) {
        haptic.notification('medium');
        setDeleteModalVisible(false);
        setConfirmPassword('');
        Alert.alert("Успех", "Ваш аккаунт и все связанные данные были безвозвратно удалены.");
      } else {
        Alert.alert("Ошибка доступа", result?.error || "Неверный пароль.");
      }
    } catch (e) {
      Alert.alert("Ошибка сети", "Не удалось связаться с сервером базы данных PostgreSQL.");
    } finally {
      setLoading(false);
    }
  };


  const changeAvatar = async (emoji) => {
    haptic.impact('medium');
    setSelectedAvatar(emoji);
    await AsyncStorage.setItem(`avatar_${nickname}`, emoji);
  };

  const renderBorderOption = (border) => {
    const isOwned = border.owned || ownedBorders[border.id] === true;
    const isActive = activeBorder === border.id;

    return (
      <TouchableOpacity
        key={border.id}
        onPress={async () => {
          haptic.impact('medium');

          if (!isOwned) {
            haptic.notification('medium');
            Alert.alert('Доступ заблокирован 🔒', 'Эту рамку необходимо сначала приобрести в магазине WaveShop!');
            return;
          }

          setActiveBorder(border.id);
          if (nickname) await AsyncStorage.setItem(`border_${user?.id || user?.email || nickname}`, border.id);
          setBorderModalVisible(false);
        }}
        style={[
          styles.borderOption,
          {
            backgroundColor: isActive ? colors.primary + '10' : colors.background,
            borderColor: isActive ? colors.primary : colors.border,
            opacity: isOwned ? 1 : 0.55,
          }
        ]}
      >
        <View style={[styles.borderColorDot, { borderColor: border.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.borderOptionTitle, { color: colors.textPrimary }]}>{border.label}</Text>
          <Text style={[styles.borderOptionType, { color: colors.textMuted }]}>
            {border.animated ? 'Анимированная рамка' : 'Обычная рамка'}
          </Text>
        </View>

        {isActive ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
        ) : !isOwned ? (
          <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
        ) : (
          <Ionicons name="ellipse-outline" size={14} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <View style={[styles.nav, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Профиль</Text>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.mainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>

          {/* 🖼️ Аватар с процедурно-генерируемой бегущей Матричной рамкой и Неоном */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              haptic.impact('medium');
              setAvatarModalVisible(true); // Открываем модалку талисманов по тапу на сову
            }}
            style={{ width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 15, alignSelf: 'center' }}
          >
            {/* 💡 СЛОЙ 1: АНИМИРОВАННЫЙ НЕОН (Твой сочный, пульсирующий неон) */}
            {activeBorder === 'neon' && (
              <Animated.View style={{
                position: 'absolute',
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 5,
                borderColor: '#FF0055',
                backgroundColor: 'transparent',
                shadowColor: '#FF0055',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 15,
                elevation: 12,
                transform: [{ scale: neonAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.97, 1.04] }) }],
                zIndex: 1,
              }} />
            )}

            {/* 💡 СЛОЙ 1.5: 🟢 БЕГУЩИЙ ЦИФРОВОЙ КОД МАТРИЦЫ (БЕСШОВНЫЙ ЦИКЛ БЕЗ ЗАДЕРЖЕК) */}
            {activeBorder === 'matrix' && (
              <>
                {/* А) ТЕНЬ СВЕЧЕНИЯ */}
                <View style={{
                  position: 'absolute',
                  width: 122,
                  height: 122,
                  borderRadius: 61,
                  backgroundColor: '#00FF41',
                  shadowColor: '#00FF41',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 12,
                  elevation: 10,
                  zIndex: 1,
                }} />

                {/* Б) АНИМИРОВАННЫЙ ВОДОПАД СИМВОЛОВ */}
                <View style={{
                  position: 'absolute',
                  width: 126,
                  height: 126,
                  borderRadius: 63,
                  backgroundColor: '#000',
                  overflow: 'hidden',
                  zIndex: 2,
                }}>
                  <Animated.View style={{
                    width: '100%',
                    height: '200%',
                    position: 'absolute',
                    alignItems: 'center',
                    justifyContent: 'flex-start', // Выравнивание строго по верхнему краю для точного шага сдвига
                    transform: [{
                      translateY: matrixScroll.interpolate({
                        inputRange: [0, 1],
                        // 💡 ИСПРАВЛЕНО: Сдвиг настроен ровно на высоту половины текстового массива (бесшовный стык)
                        outputRange: [0, -130]
                      })
                    }]
                  }}>
                    {/* 🌟 ДВА АБСОЛЮТНО ИДЕНТИЧНЫХ БЛОКА СИМВОЛОВ ДЛЯ ИЛЛЮЗИИ БЕСКОНЕЧНОСТИ */}
                    <Text style={{
                      color: '#00FF41',
                      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                      fontSize: 14,
                      fontWeight: '900',
                      textAlign: 'center',
                      letterSpacing: 4,
                      lineHeight: 13,
                    }}>
                      101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010
                    </Text>
                    {/* Дублирующий блок */}
                    <Text style={{
                      color: '#00FF41',
                      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                      fontSize: 14,
                      fontWeight: '900',
                      textAlign: 'center',
                      letterSpacing: 4,
                      lineHeight: 13,
                    }}>
                      101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010
                    </Text>
                  </Animated.View>
                </View>
              </>
            )}
            {PULSE_BORDER_COLORS[activeBorder] && (
              <>
                <Animated.View style={{
                  position: 'absolute',
                  width: 124,
                  height: 124,
                  borderRadius: 62,
                  borderWidth: 4,
                  borderColor: PULSE_BORDER_COLORS[activeBorder][0],
                  opacity: borderPulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] }),
                  transform: [{ scale: borderPulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.08] }) }],
                  shadowColor: PULSE_BORDER_COLORS[activeBorder][0],
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 12,
                  elevation: 10,
                  zIndex: 1,
                }} />
                <Animated.View style={{
                  position: 'absolute',
                  width: 112,
                  height: 112,
                  borderRadius: 56,
                  borderWidth: 3,
                  borderColor: PULSE_BORDER_COLORS[activeBorder][1],
                  opacity: borderPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.55] }),
                  transform: [{ scale: borderPulse.interpolate({ inputRange: [0, 1], outputRange: [1.02, 0.98] }) }],
                  zIndex: 4,
                }} />
              </>
            )}
            {/* 💡 СЛОЙ 2: НЕПРОЗРАЧНЫЙ СТАТИЧНЫЙ АВАТАР (Перекрывает центр) */}
            <View style={{
              position: 'absolute',
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: colors.surface,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 3, // 🌟 ПОВЫСИЛИ ДО 3: Теперь аватар гарантированно перекроет середину бегущего кода!
            }}>
              <Text style={[styles.bigEmoji, { marginBottom: 0, fontSize: 62, textAlign: 'center' }]}>
                {selectedAvatar}
              </Text>
            </View>

            {/* СТАТИЧНЫЕ МАТЕРИАЛЬНЫЕ РАМКИ (Бронза, Золото, ... ) */}
            {STATIC_BORDER_COLORS[activeBorder] && (
              <View style={{
                position: 'absolute',
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 4,
                borderColor: STATIC_BORDER_COLORS[activeBorder],
                backgroundColor: 'transparent',
                zIndex: 4, // Поверх всего
              }} />
            )}

          </TouchableOpacity>
          {/* 🖼️ КОНЕЦ Аватар с динамической рамкой кастомизации интерфейса */}





          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{nickname}</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.editBtn}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* === 📧 ОТОБРАЖЕНИЕ НАСТОЯЩЕЙ ПОЧТЫ ИЗ POSTGRESQL === */}
          {user?.email && (
            <View style={[styles.emailBadge, { backgroundColor: colors.background + '80', borderColor: colors.border, marginVertical: 8 }]}>
              <Ionicons name="mail-outline" size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.emailText, { color: colors.textMuted }]}>
                {user.email}
              </Text>
            </View>
          )}



          {/* === 📊 ДИНАМИЧЕСКИЙ ПРОГРЕСС-БАР УРОВНЯ ДЛЯ ДИПЛОМА === */}
          <View style={{ width: '100%', marginTop: 15, marginBottom: 5, paddingHorizontal: 4 }}>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              {/* Бейдж текущего уровня */}
              <View style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '30' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 }}>
                  {level} УРОВЕНЬ
                </Text>
              </View>
              {/* Текстовый счетчик опыта */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                {xpInCurrentLevel} / {xpPerLevel} XP
              </Text>
            </View>

            {/* Трек (фон) полосы прогресса */}
            <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden', marginBottom: 6 }}>
              {/* Заполненная часть полосы (ширина вычисляется динамически от 0% до 100%) */}
              <View style={{ height: '100%', backgroundColor: colors.primary, borderRadius: 5, width: `${progress * 100}%` }} />
            </View>

            {/* Подсказка об остатке */}
            <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'right', fontStyle: 'italic' }}>
              Осталось {xpRemaining} XP до следующего уровня
            </Text>
          </View>
          {/* === КОНЕЦ ВСТАВКИ ПРОГРЕСС-БАРА === */}

          <View style={styles.customizeRow}>
            <TouchableOpacity
              style={[styles.customizeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => { haptic.impact('medium'); setAvatarModalVisible(true); }}
            >
              <View style={styles.customizeButtonLeft}>
                <Text style={{ fontSize: 16 }}>{selectedAvatar}</Text>
                <Text style={[styles.customizeButtonText, { color: colors.textPrimary }]} numberOfLines={1}>Аватар</Text>
              </View>
              <View style={styles.customizeChevron}>
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.customizeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => { haptic.impact('medium'); setBorderModalVisible(true); }}
            >
              <View style={styles.customizeButtonLeft}>
                <Ionicons
                  name="color-palette-outline"
                  size={16}
                  color={BORDER_OPTIONS.find(item => item.id === activeBorder)?.color || colors.textMuted}
                />
                <Text style={[styles.customizeButtonText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {BORDER_LABELS[activeBorder] || 'Без рамки'}
                </Text>
              </View>
              <View style={styles.customizeChevron}>
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={[styles.avatarDesc, { color: colors.textMuted }]}>{AVATAR_DATA[selectedAvatar]?.desc}</Text>

          <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
            <View style={styles.statMini}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{stats.completed.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Лекций</Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
            <View style={styles.statMini}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{stats.awards.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Наград</Text>
            </View>
          </View>
        </View>

        <View style={styles.profileSummaryGrid}>
          <View style={[styles.profileSummaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{level}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Уровень</Text>
          </View>
          <View style={[styles.profileSummaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: '#F1C40F15' }]}>
              <Ionicons name="star-outline" size={20} color="#F1C40F" />
            </View>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{user?.balance || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>XP / монеты</Text>
          </View>
          <View style={[styles.profileSummaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
            </View>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{stats.completed.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Тем</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.achBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Achievements')}
        >
          <View style={styles.achBtnLeft}>
            <View style={[styles.achIconBox, { backgroundColor: '#F1C40F15' }]}>
              <Ionicons name="trophy-outline" size={22} color="#F1C40F" />
            </View>
            <View>
              <Text style={[styles.achBtnText, { color: colors.textPrimary }]}>Достижения</Text>
              <Text style={[styles.achBtnSub, { color: colors.textMuted }]}>Награды, серии и учебные цели</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* КНОПКИ УПРАВЛЕНИЯ СЕССИЕЙ И АККАУНТОМ */}
        <View style={{ gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={logout}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.logoutText, { color: colors.textPrimary }]}>Выйти из аккаунта</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: '#FF5E5E', backgroundColor: colors.surface }]}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF5E5E" />
            <Text style={[styles.logoutText, { color: '#FF5E5E' }]}>Удалить аккаунт безвозвратно</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ (ЗАЩИТА ПАРОЛЕМ) */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Ionicons name="warning" size={24} color="#FF5E5E" style={{ marginRight: 10 }} />
              <Text style={[styles.modalT, { color: '#FF5E5E', marginBottom: 0 }]}>Удаление профиля</Text>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 18 }}>
              Это действие полностью сотрет ваш прогресс лекций и достижения без возможности восстановления. Введите текущий пароль:
            </Text>

            <TextInput
              style={[styles.mInput, { borderColor: '#FF5E5E', color: colors.textPrimary }]}
              placeholder="Ваш пароль"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={true}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoFocus={true}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 10 }}>
              <TouchableOpacity onPress={() => { setDeleteModalVisible(false); setConfirmPassword(''); }}>
                <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmDelete} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FF5E5E" />
                ) : (
                  <Text style={{ color: '#FF5E5E', fontWeight: 'bold' }}>Удалить 🔴</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* МОДАЛКА СМЕНЫ НИКА */}

      <Modal visible={editModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalT, { color: colors.textPrimary }]}>Изменить имя</Text>
            <TextInput
              style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Новый никнейм"
              placeholderTextColor={colors.textMuted}
              value={tempNickname}
              onChangeText={setTempNickname}
              autoFocus={true}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 10 }}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveNewNickname} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Сохранить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔮 МОДАЛКА 1: ВЫБОР ТАЛИСМАНА */}
      <Modal visible={avatarModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalT, { color: colors.textPrimary }]}>Выберите талисман</Text>

            {/* 💡 ИСПРАВЛЕНО: Добавлен автоматический перенос строк flexWrap и центрирование */}
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 15,
              gap: 12, // Увеличили расстояние для удобного нажатия пальцем
              width: '100%'
            }}>
              {Object.keys(AVATAR_DATA).map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => { changeAvatar(emoji); setAvatarModalVisible(false); }}
                  style={{
                    width: 56, // Фиксированный квадратный размер кнопки
                    height: 56,
                    borderRadius: 18,
                    borderWidth: 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: selectedAvatar === emoji ? colors.primary + '15' : colors.background,
                    borderColor: selectedAvatar === emoji ? colors.primary : colors.border
                  }}
                >
                  <Text style={{ fontSize: 26, textAlign: 'center' }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>


            <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={() => setAvatarModalVisible(false)}>
              <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

{/* 🔮 МОДАЛКА 2: ВЫБОР КУПЛЕННОЙ РАМКИ (ТЕПЕРЬ С ПРОВЕРКОЙ ПРАВ ДОСТУПА!) */}
<Modal visible={borderModalVisible} animationType="slide" transparent>
<View style={styles.modalOverlay}>
<View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
<Text style={[styles.modalT, { color: colors.textPrimary }]}>Выберите рамку</Text>
<ScrollView style={styles.borderModalScroll} showsVerticalScrollIndicator>
  <Text style={[styles.borderSectionTitle, { color: colors.textMuted }]}>ОБЫЧНЫЕ</Text>
  <View style={styles.borderOptionsGroup}>
    {BORDER_OPTIONS.filter(item => !item.animated).map(renderBorderOption)}
  </View>

  <Text style={[styles.borderSectionTitle, { color: colors.textMuted, marginTop: 14 }]}>АНИМИРОВАННЫЕ</Text>
  <View style={styles.borderOptionsGroup}>
    {BORDER_OPTIONS.filter(item => item.animated).map(renderBorderOption)}
  </View>
</ScrollView>
<TouchableOpacity style={{ marginTop: 5, alignItems: 'center' }} onPress={() => setBorderModalVisible(false)}>
<Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Закрыть</Text>
</TouchableOpacity>
</View>
</View>
</Modal>

    </View>

  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  navTitle: { fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  mainCard: { padding: 30, borderRadius: 32, alignItems: 'center', borderWidth: 1, marginBottom: 20, elevation: 4, shadowOpacity: 0.05, shadowRadius: 15 },
  bigEmoji: { fontSize: 80 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  userName: { fontSize: 26, fontWeight: 'bold' },
  editBtn: { padding: 5 },
  customizeRow: { flexDirection: 'row', gap: 10, marginTop: 15, width: '100%' },
  customizeButton: { flex: 1, minWidth: 0, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 13, paddingRight: 8, borderRadius: 16, borderWidth: 1 },
  customizeButtonLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 },
  customizeButtonText: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '800' },
  customizeChevron: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  avatarDesc: { fontSize: 13, textAlign: 'center', fontStyle: 'italic', marginBottom: 20 },
  quickStats: { flexDirection: 'row', width: '100%', borderTopWidth: 1, paddingTop: 20 },
  statMini: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  dividerVertical: { width: 1, height: '100%' },
  profileSummaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  profileSummaryCard: { flex: 1, borderWidth: 1, borderRadius: 22, padding: 14, alignItems: 'center', elevation: 2 },
  summaryIconBox: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 18, fontWeight: '900' },
  summaryLabel: { fontSize: 10, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  achBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 24, borderWidth: 1, marginBottom: 30, elevation: 2 },
  achBtnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  achIconBox: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  achBtnText: { fontWeight: '900', fontSize: 16 },
  achBtnSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  logoutBtn: { height: 60, borderRadius: 20, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 2 },
  logoutText: { color: '#FF5E5E', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  modalBox: { padding: 30, borderRadius: 32, elevation: 10, borderWidth: 1, borderColor: 'transparent', maxHeight: '88%' },
  modalT: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  mInput: { height: 60, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 15, marginBottom: 20, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 25, paddingRight: 5 },
  borderModalScroll: { maxHeight: 430, marginBottom: 14 },
  borderOptionsGroup: { gap: 10 },
  borderSectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, marginBottom: 10 },
  borderOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  borderColorDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
  borderOptionTitle: { fontSize: 14, fontWeight: '800' },
  borderOptionType: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // === СТИЛИ ПЛАШКИ ПОЧТЫ ===
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 12,
  },
  emailText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});


export default ProfileScreen;

