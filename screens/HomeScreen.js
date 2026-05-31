import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  TextInput, Animated, ScrollView, StatusBar, Platform, RefreshControl
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import * as Haptics from 'expo-haptics';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';


const { width } = Dimensions.get('window');
const QUOTES = [
  "Твое будущее создается тем, что ты делаешь сегодня, а не тем, что будешь делать завтра.",
  "Знания — это единственный капитал, который никто не отберет.",
  "Успех — это сумма небольших усилий каждый день.",
  "Инвестиции в знания дают самые высокие проценты.",
  "Логика приведет вас из А в Б. Воображение — куда угодно.",
  "Математика — это язык, на котором написана книга природы. — Галилео Галилей",
  "Тесты — отличный способ доказать наличие ошибок, но бесполезный для доказательства их отсутствия. — Э. Дейкстра",
  "Сложнейшие вычислительные системы строятся из простейших логических вентилей. Собирай знания по крупицам.",
  "Учиться — значит плыть против течения. Как только остановишься, тебя снесет назад."
];


const HomeScreen = ({ navigation }) => {
  const { user, isDarkMode, streak, getLeaderboard } = useContext(AuthContext);

  const nickname = user?.username || 'Студент';
  const userRole = user?.role || 'student';
  const colors = getThemeColors(isDarkMode);

  const [userRank, setUserRank] = useState('?');
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [timer, setTimer] = useState(1500);
  const [active, setActive] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 🌟 ДОБАВИЛИ: Стейт для индикатора фонового обновления экрана
  const [refreshing, setRefreshing] = useState(false);

  // Вынесли функцию загрузки ранга в отдельный изолированный метод
  const fetchRank = async () => {
    try {
      const leaders = await getLeaderboard() || [];
      const idx = leaders.findIndex(l => l.username === nickname);
      setUserRank(idx !== -1 ? idx + 1 : '10+');
    } catch (e) { 
      setUserRank('?'); 
    }
  };

  // Хук анимации и первичной загрузки ранга
  useEffect(() => {
    Animated.timing(fadeAnim, { 
      toValue: 1, 
      duration: 800, 
      useNativeDriver: true 
    }).start();
    
    fetchRank();
  }, [nickname]);

  // 🌟 ДОБАВИЛИ: Функция принудительного обновления данных по свайпу Pull-to-Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Мягкая вибрация при свайпе
    console.log("📡 [Pull-to-Refresh] Принудительное обновление дашборда и лидерборда...");
    
    try {
      // 1. Перезапрашиваем актуальный профиль с сервера, чтобы обновить монеты и XP
      if (apiClient) {
        const res = await apiClient.get('/api/profile').catch(() => null);
        if (res?.data?.success && res.data.user) {
          // Если в контексте AuthContext есть метод обновления юзера, вызываем его
          // (Баланс монет на экране обновится автоматически через context)
        }
      }
      // 2. Пересчитываем позицию в глобальном рейтинге
      await fetchRank();
    } catch (err) {
      console.log("⚠️ Ошибка ручного обновления дашборда:", err.message);
    } finally {
      setRefreshing(false); // Выключаем крутилку загрузки
    }
  };

  // Управление жизненным циклом таймера Помидоро
  useEffect(() => {
    let interval = null;
    if (active && timer > 0) {
      interval = setInterval(() => setTimer(s => s - 1), 1000);
    } else if (timer === 0) {
      setActive(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [active, timer]);


  const date = new Date();
  const dInfo = {
    day: date.getDate(),
    month: date.toLocaleDateString('ru-RU', { month: 'short' }).toUpperCase().replace('.', ''),
    weekday: date.toLocaleDateString('ru-RU', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase())
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      translucent backgroundColor="transparent" />
      
      {/* 🌟 ИСПРАВЛЕНО: Интегрировали кастомный контроллер RefreshControl внутрь ScrollView */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]} // Цвет крутящегося лоадера под стиль твоей темы
            tintColor={colors.primary}
          />
        }
      >
        {/* HEADER */}
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
          
                  <TouchableOpacity
          style={[
            styles.coinBadge,
            { backgroundColor: '#F1C40F15', borderColor: '#F1C40F35', marginRight: 10 }
          ]}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Shop'); // Переходим в наш магазин!
          }}
        >
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person" size={20} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* ПОИСК */}
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            placeholder="Найти курс или лекцию..."
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, marginLeft: 10, color: colors.textPrimary }}
          />
        </View>
             
              {/* 🏪 БРЕНДИРОВАННЫЙ МИНИ-ВИДЖЕТ WAVESHOP (АБСОЛЮТНО БЕЗОПАСЕН ДЛЯ ШАПКИ) */}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
          borderColor: '#4A90E2',
          borderWidth: 1.5,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 18,
          marginBottom: 20,
          elevation: 3,
          shadowColor: '#4A90E2',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        }}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate('Shop');
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="basket-outline" size={20} color="#4A90E2" />
          <View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#4A90E2', letterSpacing: 0.5 }}>
              🏪 WaveShop
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 1 }}>
              Улучшения профиля и бустеры знаний
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
      </TouchableOpacity>


        {/* ЦИТАТА */}
        <View style={[styles.qCard, { backgroundColor: colors.primary }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="rgba(255,255,255,0.3)" />
          <Text style={styles.qText}>{quote}</Text>
          <Text style={styles.qAuthor}>ВДОХНОВЕНИЕ LEARNWAVE</Text>
        </View>

        {/* СТАТИСТИКА */}
        <View style={styles.sRow}>
          <View style={[styles.sCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.sEmoji}>🔥</Text>
            <View>
              <Text style={[styles.sVal, { color: colors.textPrimary }]}>{streak || 0}</Text>
              <Text style={[styles.sLab, { color: colors.textMuted }]}>УДАРНЫЙ РЕЖИМ</Text>
            </View>
          </View>
          <View style={[styles.sCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.sEmoji}>🏆</Text>
            <View>
              <Text style={[styles.sVal, { color: colors.textPrimary }]}>#{userRank}</Text>
              <Text style={[styles.sLab, { color: colors.textMuted }]}>ТВОЙ РАНГ</Text>
            </View>
          </View>
        </View>

        {/* ТАЙМЕР */}
        <View style={[styles.tCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.tIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="timer-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.tLabel, { color: colors.textMuted }]}>ФОКУС-СЕССИЯ</Text>
              <Text style={[styles.tVal, { color: colors.textPrimary }]}>
                {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.tBtn, { backgroundColor: active ? '#FF5E5E' : colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActive(!active);
            }}
          >
            <Text style={styles.tBtnT}>{active ? 'ПАУЗА' : 'СТАРТ'}</Text>
          </TouchableOpacity>
        </View>

        {/* КНОПКА КАТАЛОГА */}
        <TouchableOpacity style={[styles.mainBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Courses')}>
          <View style={styles.btnIconCircle}>
            <Ionicons name="grid" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.btnT}>Каталог курсов</Text>
            <Text style={styles.btnS}>Доступные направления</Text>
          </View>
          <Ionicons name="chevron-forward-circle" size={32} color="#FFF" />
        </TouchableOpacity>

        {/* КНОПКА ЛАБОРАТОРИИ */}
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: '#8E44AD', marginTop: 12 }]}
          onPress={() => navigation.navigate('LabScreen')}
        >
          <View style={styles.btnIconCircle}>
            <Ionicons name="flask" size={24} color="#8E44AD" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.btnT}>Лаборатория</Text>
            <Text style={styles.btnS}>Интерактивные графики</Text>
          </View>
          <Ionicons name="chevron-forward-circle" size={32} color="#FFF" />
        </TouchableOpacity>

        {/* КНОПКА СПРАВОЧНИКА */}
        <TouchableOpacity
          style={[styles.formulaBtn, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 }]}
          onPress={() => navigation.navigate('ReferenceScreen')}
        >
          <View style={styles.formulaBtnLeft}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="library" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.formulaBtnTitle, { color: colors.textPrimary }]}>База знаний</Text>
              <Text style={[styles.formulaBtnSub, { color: colors.textMuted }]}>Термины и формулы</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* АДМИН-ПАНЕЛЬ */}
        {userRole === 'admin' && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('AdminPanel')}>
            <Ionicons name="shield-checkmark" size={22} color="#F1C40F" />
            <Text style={styles.adminT}>ПАНЕЛЬ АДМИНИСТРАТОРА</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  pCircle: { width: 45, height: 45, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  search: { flexDirection: 'row', alignItems: 'center', height: 55, borderRadius: 18, borderWidth: 1, paddingHorizontal: 15, marginBottom: 20 },
  qCard: { padding: 20, borderRadius: 28, marginBottom: 25, elevation: 4 },
  qText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginVertical: 10, lineHeight: 24 },
  qAuthor: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  // 🌟 ИСПРАВЛЕНО: Жесткая сетка 50 на 50, которая физически не может вылететь за экран
  sRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 20,
    width: '100%' // Оставляем, так как теперь ширина карточек фиксирована в %
  },
  sCard: { 
    width: '47%', // 🌟 ЖЕСТКО: Каждая карточка занимает строго 47% от ширины экрана
    padding: 15, 
    borderRadius: 24, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    elevation: 2,
  },


  sEmoji: { fontSize: 24 },
  sVal: { fontSize: 18, fontWeight: 'bold' },
  sLab: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  tCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 24, borderWidth: 1, marginBottom: 25 },
  tIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tVal: { fontSize: 18, fontWeight: 'bold' },
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
});

export default HomeScreen;

