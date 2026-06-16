import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, Animated, ScrollView, StatusBar, Platform, RefreshControl,
  useWindowDimensions, Modal
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import apiClient from '../services/api'; // ← ИСПРАВЛЕНО: был не импортирован

// ─── Haptics: безопасная обёртка для веба ────────────────────────────────────
const haptic = {
  impact: (style) => {
    if (Platform.OS !== 'web') {
      const Haptics = require('expo-haptics');
      Haptics.impactAsync(style);
    }
  },
  notification: (type) => {
    if (Platform.OS !== 'web') {
      const Haptics = require('expo-haptics');
      Haptics.notificationAsync(type);
    }
  },
};

const QUOTES = [
  'Образование — это не заполнение ведра, а зажигание огня.',
  'Знание — сила. Учись каждый день.',
  'Инвестиции в знания приносят наибольший доход.',
  'Учиться никогда не поздно.',
  'Каждый эксперт когда-то был новичком.',
];

const HomeScreen = ({ navigation }) => {
  // ИСПРАВЛЕНО: useWindowDimensions вместо Dimensions.get() — корректно при ресайзе окна на вебе
  const { width } = useWindowDimensions();

  const { user, isDarkMode, streak, getLeaderboard } = useContext(AuthContext);
  const nickname = user?.username || 'Студент';
  const userRole = user?.role || 'student';
  const colors = getThemeColors(isDarkMode);

  const [userRank, setUserRank] = useState('?');
  const [freezeDays, setFreezeDays] = useState(0);
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [timer, setTimer] = useState(1500); // 25 минут
  const [active, setActive] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [pomodoroInfoVisible, setPomodoroInfoVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const date = new Date();
  const dInfo = {
    day: date.getDate(),
    month: date.toLocaleDateString('ru-RU', { month: 'short' }).toUpperCase().replace('.', ''),
    weekday: date.toLocaleDateString('ru-RU', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase()),
  };

  // ─── Рейтинг пользователя ─────────────────────────────────────────────────
  const fetchRank = async () => {
    try {
      const serverRank = await apiClient.get('/leaderboard').catch(() => null);
      const leaders = serverRank?.data?.leaders || await getLeaderboard() || [];
      const idx = leaders.findIndex(l =>
        (user?.id && String(l.id) === String(user.id)) ||
        (user?.email && String(l.email || '').toLowerCase() === String(user.email).toLowerCase()) ||
        (!user?.id && !user?.email && l.username === nickname)
      );
      setUserRank(idx !== -1 ? idx + 1 : '10+');
    } catch {
      setUserRank('?');
    }
  };

  const fetchInventorySummary = async () => {
    try {
      const res = await apiClient.get('/shop/inventory');
      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      const freezeItem = items.find(item => item.item_type === 'streak_freeze' && item.item_value === 'freeze_day');
      setFreezeDays(Number(freezeItem?.quantity || 0));
    } catch {
      setFreezeDays(0);
    }
  };

  // ─── Инициализация ────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    fetchRank();
    fetchInventorySummary();
  }, [nickname, user?.id, user?.email]);

  // ─── Таймер Помодоро ──────────────────────────────────────────────────────
  useEffect(() => {
    let interval = null;
    if (active && timer > 0) {
      interval = setInterval(() => setTimer(s => s - 1), 1000);
    } else if (timer === 0) {
      setActive(false);
      setTimer(1500);
      haptic.notification('Success');
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [active, timer]);

  // ─── Pull-to-Refresh ──────────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    haptic.impact('Medium');
    try {
      // ИСПРАВЛЕНО: apiClient теперь импортирован — этот код больше не падает
      const res = await apiClient.get('/api/profile').catch(() => null);
      if (res?.data?.success) {
        // Профиль обновится через AuthContext при следующем рендере
      }
      await fetchRank();
      await fetchInventorySummary();
    } catch (err) {
      console.log('⚠️ [HomeScreen] Refresh error:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 60 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Шапка ─────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.cal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.calM, { color: colors.primary }]}>{dInfo.month}</Text>
              <Text style={[styles.calD, { color: colors.textPrimary }]}>{dInfo.day}</Text>
            </View>
            <View style={{ marginLeft: 15 }}>
              <Text style={[styles.week, { color: colors.textMuted }]}>{dInfo.weekday}</Text>
              <Text style={[styles.welcome, { color: colors.textPrimary }]}>Привет, {nickname}!</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={[styles.pCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Поиск ─────────────────────────────────────────────────────── */}
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            placeholder="Поиск курсов..."
            placeholderTextColor={colors.textMuted}
            value={courseSearch}
            onChangeText={setCourseSearch}
            returnKeyType="search"
            onSubmitEditing={() => navigation.navigate('Courses', { initialSearch: courseSearch.trim() })}
            style={{ flex: 1, marginLeft: 10, color: colors.textPrimary }}
          />
          {courseSearch.trim().length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Courses', { initialSearch: courseSearch.trim() })}>
              <Ionicons name="arrow-forward-circle" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.planCard, { backgroundColor: colors.primary }]}>
          <View style={styles.planHeader}>
            <View style={styles.planIcon}>
              <Ionicons name="flag-outline" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planLabel}>ПЛАН НА СЕГОДНЯ</Text>
              <Text style={styles.planTitle}>Одна тема и короткий квиз</Text>
            </View>
          </View>
          <Text style={styles.planText}>
            Выберите курс, пройдите материал и закрепите его вопросом в конце темы.
          </Text>
          <TouchableOpacity
            style={styles.planButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Courses')}
          >
            <Text style={[styles.planButtonText, { color: colors.primary }]}>Продолжить обучение</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.quoteMini, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.quoteIcon, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.quoteMiniLabel, { color: colors.textMuted }]}>Фраза дня</Text>
            <Text style={[styles.quoteMiniText, { color: colors.textPrimary }]}>{quote}</Text>
          </View>
        </View>

        {/* ── Статистика ────────────────────────────────────────────────── */}
        <View style={styles.sRow}>
          <View style={[styles.sCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.sEmoji}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sVal, { color: colors.textPrimary }]}>{streak || 0}</Text>
              <Text style={[styles.sLab, { color: colors.textMuted }]}>СЕРИЯ ДНЕЙ</Text>
              <Text style={[styles.freezeMini, { color: freezeDays > 0 ? colors.primary : colors.textMuted }]}>
                Заморозок: {freezeDays}
              </Text>
            </View>
          </View>
          <View style={[styles.sCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.sEmoji}>🏆</Text>
            <View>
              <Text style={[styles.sVal, { color: colors.textPrimary }]}>#{userRank}</Text>
              <Text style={[styles.sLab, { color: colors.textMuted }]}>РЕЙТИНГ</Text>
            </View>
          </View>
        </View>

        {/* ── Таймер Помодоро ───────────────────────────────────────────── */}
        <View style={[styles.tCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.tIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="timer-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <View style={styles.timerTitleRow}>
                <Text style={[styles.tLabel, { color: colors.textMuted }]}>ПОМОДОРО</Text>
                <TouchableOpacity
                  style={[styles.infoBtn, { borderColor: colors.border }]}
                  onPress={() => setPomodoroInfoVisible(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="information" size={12} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.tVal, { color: colors.textPrimary }]}>
                {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.tBtn, { backgroundColor: active ? '#FF5E5E' : colors.primary }]}
            onPress={() => { haptic.impact('Light'); setActive(!active); }}
          >
            <Text style={styles.tBtnT}>{active ? 'Пауза' : 'Старт'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Быстрые действия</Text>

        {/* ── Курсы ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Courses')}
        >
          <View style={styles.btnIconCircle}>
            <Ionicons name="grid" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.btnT}>Мои курсы</Text>
            <Text style={styles.btnS}>Продолжить обучение</Text>
          </View>
          <Ionicons name="chevron-forward-circle" size={32} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shopBanner, {
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            borderColor: colors.border,
            marginTop: 12,
          }]}
          activeOpacity={0.8}
          onPress={() => { haptic.impact('Medium'); navigation.navigate('Shop'); }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.iconCircle, { backgroundColor: '#F1C40F15' }]}>
              <Ionicons name="basket-outline" size={21} color="#F1C40F" />
            </View>
            <View>
              <Text style={[styles.shopTitle, { color: colors.textPrimary }]}>WaveShop</Text>
              <Text style={[styles.shopSub, { color: colors.textMuted }]}>Рамки профиля, бонусы и подсказки</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
        {/* ── Лаборатория ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: '#8E44AD', marginTop: 12 }]}
          onPress={() => navigation.navigate('LabScreen')}
        >
          <View style={styles.btnIconCircle}>
            <Ionicons name="flask" size={24} color="#8E44AD" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.btnT}>Лаборатория</Text>
            <Text style={styles.btnS}>Интерактивные задачи</Text>
          </View>
          <Ionicons name="chevron-forward-circle" size={32} color="#FFF" />
        </TouchableOpacity>

        {/* ── Справочник ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.formulaBtn, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 }]}
          onPress={() => navigation.navigate('ReferenceScreen')}
        >
          <View style={styles.formulaBtnLeft}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="library" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.formulaBtnTitle, { color: colors.textPrimary }]}>Справочник</Text>
              <Text style={[styles.formulaBtnSub, { color: colors.textMuted }]}>Глоссарий и формулы</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* ── Кнопка администратора ─────────────────────────────────────── */}
        {userRole === 'admin' && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => navigation.navigate('AdminPanel')}
          >
            <Ionicons name="shield-checkmark" size={22} color="#F1C40F" />
            <Text style={styles.adminT}>ПАНЕЛЬ АДМИНИСТРАТОРА</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={pomodoroInfoVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.infoModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.infoModalIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="timer-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.infoModalTitle, { color: colors.textPrimary }]}>Что такое Помодоро?</Text>
            <Text style={[styles.infoModalText, { color: colors.textMuted }]}>
              Это короткий учебный фокус-сет: 25 минут работы без отвлечений, затем небольшой перерыв. Метод помогает проходить темы спокойнее и не перегружаться.
            </Text>
            <TouchableOpacity
              style={[styles.infoModalButton, { backgroundColor: colors.primary }]}
              onPress={() => setPomodoroInfoVisible(false)}
            >
              <Text style={styles.infoModalButtonText}>Понятно</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  cal: { width: 50, height: 55, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calM: { fontSize: 10, fontWeight: '900' },
  calD: { fontSize: 20, fontWeight: 'bold' },
  week: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  welcome: { fontSize: 20, fontWeight: 'bold' },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  coinText: { color: '#F1C40F', fontWeight: 'bold', fontSize: 13 },
  pCircle: { width: 45, height: 45, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  search: { flexDirection: 'row', alignItems: 'center', height: 55, borderRadius: 18, borderWidth: 1, paddingHorizontal: 15, marginBottom: 20 },
  shopBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, elevation: 2 },
  shopTitle: { fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  shopSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  planCard: { padding: 20, borderRadius: 28, marginBottom: 22, elevation: 4 },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  planIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  planLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 3 },
  planTitle: { color: '#FFF', fontSize: 21, fontWeight: '900', lineHeight: 26 },
  planText: { color: 'rgba(255,255,255,0.86)', fontSize: 14, fontWeight: '600', lineHeight: 21, marginBottom: 16 },
  planButton: { height: 46, borderRadius: 15, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  planButtonText: { fontSize: 14, fontWeight: '900' },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
  quoteMini: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 20 },
  quoteIcon: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  quoteMiniLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 3, textTransform: 'uppercase' },
  quoteMiniText: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  qCard: { padding: 20, borderRadius: 28, marginBottom: 25, elevation: 4 },
  qText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginVertical: 10, lineHeight: 24 },
  qAuthor: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sCard: { width: '47%', padding: 15, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 2 },
  sEmoji: { fontSize: 24 },
  sVal: { fontSize: 18, fontWeight: 'bold' },
  freezeMini: { fontSize: 10, fontWeight: '900', marginTop: 3 },
  sLab: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  tCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 24, borderWidth: 1, marginBottom: 25 },
  tIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  timerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tVal: { fontSize: 18, fontWeight: 'bold' },
  infoBtn: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  tBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  tBtnT: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  mainBtn: { height: 85, borderRadius: 28, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, elevation: 6 },
  btnIconCircle: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  btnT: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  btnS: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  formulaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 24, borderWidth: 1 },
  formulaBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  formulaBtnTitle: { fontSize: 16, fontWeight: 'bold' },
  formulaBtnSub: { fontSize: 12 },
  adminBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 30, padding: 15, backgroundColor: '#1A202C', borderRadius: 20 },
  adminT: { color: '#F1C40F', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  infoModal: { borderRadius: 28, borderWidth: 1, padding: 24, alignItems: 'center' },
  infoModalIcon: { width: 62, height: 62, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  infoModalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  infoModalText: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  infoModalButton: { height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  infoModalButtonText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
});

export default HomeScreen;

