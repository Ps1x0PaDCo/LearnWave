import React, { useContext, useMemo, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  StatusBar, Platform 
} from 'react-native';
import { AuthContext, CoursesContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const AchievementsScreen = ({ navigation }) => {
  const { isDarkMode, streak, balance, user } = useContext(AuthContext);
  const { completedCourses } = useContext(CoursesContext);
  const colors = getThemeColors(isDarkMode);

  // Текущие метрики игрока
  const currentXP = user?.balance || 0;
  const currentLectures = completedCourses.length;
  const currentStreak = streak || 0;

  // --- ДИНАМИЧЕСКИЙ СПИСОК ИЗ 30 ДОСТИЖЕНИЙ ---
  const achievements = useMemo(() => [
    // === КАТЕГОРИЯ: ЛЕКЦИИ И ОБУЧЕНИЕ (1-8) ===
    {
      id: 1,
      title: 'Первая волна',
      desc: 'Завершите вашу первую лекцию',
      icon: 'water',
      target: 1,
      current: currentLectures,
      unlocked: currentLectures >= 1,
      color: '#4A90E2'
    },
    {
      id: 2,
      title: 'Магистр знаний',
      desc: 'Изучите 5 различных тем',
      icon: 'medal',
      target: 5,
      current: currentLectures,
      unlocked: currentLectures >= 5,
      color: '#9B59B6'
    },
    {
      id: 3,
      title: 'Грызун науки',
      desc: 'Успешно закройте 10 лекций',
      icon: 'school',
      target: 10,
      current: currentLectures,
      unlocked: currentLectures >= 10,
      color: '#E67E22'
    },
    {
      id: 4,
      title: 'Книжный червь',
      desc: 'Пройдите 15 учебных блоков',
      icon: 'book',
      target: 15,
      current: currentLectures,
      unlocked: currentLectures >= 15,
      color: '#1ABC9C'
    },
    {
      id: 5,
      title: 'Профессор',
      desc: 'Изучите 20 лекций в приложении',
      icon: 'glasses',
      target: 20,
      current: currentLectures,
      unlocked: currentLectures >= 20,
      color: '#34495E'
    },
    {
      id: 6,
      title: 'Академик',
      desc: 'Освойте 25 тем курса',
      icon: 'ribbon',
      target: 25,
      current: currentLectures,
      unlocked: currentLectures >= 25,
      color: '#E74C3C'
    },
    {
      id: 7,
      title: 'Интеллектуал',
      desc: 'Наберите багаж из 30 пройденных лекций',
      icon: 'bulb',
      target: 30,
      current: currentLectures,
      unlocked: currentLectures >= 30,
      color: '#F39C12'
    },
    {
      id: 8,
      title: 'Абсолютный Разум',
      desc: 'Завершите 40 лекций в базе знаний',
      icon: 'infinite',
      target: 40,
      current: currentLectures,
      unlocked: currentLectures >= 40,
      color: '#2C3E50'
    },

    // === КАТЕГОРИЯ: УДАРНЫЙ РЕЖИМ / СТРИКИ (9-15) ===
    {
      id: 9,
      title: 'В ударе',
      desc: 'Ударный режим в течение 3 дней',
      icon: 'flame',
      target: 3,
      current: currentStreak,
      unlocked: currentStreak >= 3,
      color: '#FF5E5E'
    },
    {
      id: 10,
      title: 'Привычка учиться',
      desc: 'Поддерживайте стрик 5 дней подряд',
      icon: 'calendar',
      target: 5,
      current: currentStreak,
      unlocked: currentStreak >= 5,
      color: '#FF7F50'
    },
    {
      id: 11,
      title: 'Железная воля',
      desc: 'Заходите в приложение 7 дней подряд',
      icon: 'barbell',
      target: 7,
      current: currentStreak,
      unlocked: currentStreak >= 7,
      color: '#E84393'
    },
    {
      id: 12,
      title: 'Две недели прогресса',
      desc: 'Сохраняйте ударный режим 14 дней',
      icon: 'hourglass',
      target: 14,
      current: currentStreak,
      unlocked: currentStreak >= 14,
      color: '#6C5CE7'
    },
    {
      id: 13,
      title: 'Месяц на волне',
      desc: 'Не прерывайте стрик в течение 30 дней',
      icon: 'star',
      target: 30,
      current: currentStreak,
      unlocked: currentStreak >= 30,
      color: '#00CEC9'
    },
    {
      id: 14,
      title: 'Настоящий Спартанец',
      desc: 'Удерживайте стрик 50 дней подряд',
      icon: 'shield',
      target: 50,
      current: currentStreak,
      unlocked: currentStreak >= 50,
      color: '#D63031'
    },
    {
      id: 15,
      title: 'Бессмертный',
      desc: 'Достигните невероятных 100 дней стрика',
      icon: 'thunderstorm',
      target: 100,
      current: currentStreak,
      unlocked: currentStreak >= 100,
      color: '#2D3436'
    },

    // === КАТЕГОРИЯ: ОПЫТ (XP) И БАЛАНС МОНЕТ (16-23) ===
    {
      id: 16,
      title: 'Золотой запас',
      desc: 'Накопите 500 очков опыта (XP)',
      icon: 'trophy',
      target: 500,
      current: currentXP,
      unlocked: currentXP >= 500,
      color: '#F1C40F'
    },
    {
      id: 17,
      title: 'Копилка знаний',
      desc: 'Соберите на балансе 1000 XP',
      icon: 'wallet',
      target: 1000,
      current: currentXP,
      unlocked: currentXP >= 1000,
      color: '#2ECC71'
    },
    {
      id: 18,
      title: 'Опытный Студент',
      desc: 'Перешагните отметку в 2000 XP',
      icon: 'cash',
      target: 2000,
      current: currentXP,
      unlocked: currentXP >= 2000,
      color: '#27AE60'
    },
    {
      id: 19,
      title: 'Зажиточный ум',
      desc: 'Наберите суммарно 3500 XP',
      icon: 'briefcase',
      target: 3500,
      current: currentXP,
      unlocked: currentXP >= 3500,
      color: '#2980B9'
    },
    {
      id: 20,
      title: 'XP-Магнат',
      desc: 'Заработайте 5000 XP на лекциях',
      icon: 'diamond',
      target: 5000,
      current: currentXP,
      unlocked: currentXP >= 5000,
      color: '#0984E3'
    },
    {
      id: 21,
      title: 'Золотая жила',
      desc: 'Наберите круглую сумму в 7500 XP',
      icon: 'gift',
      target: 7500,
      current: currentXP,
      unlocked: currentXP >= 7500,
      color: '#FDCB6E'
    },
    {
      id: 22,
      title: 'Миллионер LearnWave',
      desc: 'Достигните планки в 10 000 XP',
      icon: 'key',
      target: 10000,
      current: currentXP,
      unlocked: currentXP >= 10000,
      color: '#6C5CE7'
    },
    {
      id: 23,
      title: 'Хранитель Казны',
      desc: 'Установите рекорд в 15 000 XP',
      icon: 'cube',
      target: 15000,
      current: currentXP,
      unlocked: currentXP >= 15000,
      color: '#B2BEC3'
    },

    // === КАТЕГОРИЯ: СПЕЦИАЛЬНЫЕ И СЕКРЕТНЫЕ (24-30) ===
    {
      id: 24,
      title: 'Амбассадор',
      desc: 'Станьте частью команды LearnWave',
      icon: 'heart',
      target: 1,
      current: user?.role === 'admin' ? 1 : 0,
      unlocked: user?.role === 'admin',
      color: '#2ECC71'
    },
    {
      id: 25,
      title: 'Первопроходец',
      desc: 'Зарегистрируйте личный профиль в системе',
      icon: 'rocket',
      target: 1,
      current: user ? 1 : 0,
      unlocked: user !== null,
      color: '#E74C3C'
    },
    {
      id: 26,
      title: 'Полуночник',
      desc: 'Пройдите тему во время ночного штурма науки',
      icon: 'moon',
      target: 1,
      current: 0,
      unlocked: false,
      color: '#9C88FF'
    },
    {
      id: 27,
      title: 'Отличник',
      desc: 'Наберите баланс без единой ошибки за сессию',
      icon: 'checkmark-circle',
      target: 1,
      current: 0,
      unlocked: false,
      color: '#4CD137'
    },
    {
      id: 28,
      title: 'Исследователь кода',
      desc: 'Откройте скрытые возможности базы данных',
      icon: 'code-working',
      target: 1,
      current: 0,
      unlocked: false,
      color: '#487EB0'
    },
    {
      id: 29,
      title: 'Супер-Студент',
      desc: 'Имейте одновременно 4 дня стрика и 3 лекции',
      icon: 'flash',
      target: 1,
      current: 0,
      unlocked: false,
      color: '#F5CD79'
    },
    {
      id: 30,
      title: 'Легенда ВУЗа',
      desc: 'Разблокируйте более 15 любых достижений',
      icon: 'crown',
      target: 15,
      current: 0,
      unlocked: false,
      color: '#ED4C67'
    }
  ], [currentLectures, currentStreak, currentXP, user]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalProgress = (unlockedCount / achievements.length) * 100;
  const categories = [
    { key: 'all', title: 'Все', icon: 'apps-outline', range: [1, 30] },
    { key: 'learn', title: 'Учёба', icon: 'book-outline', range: [1, 8] },
    { key: 'streak', title: 'Серия', icon: 'flame-outline', range: [9, 15] },
    { key: 'xp', title: 'XP', icon: 'star-outline', range: [16, 23] },
    { key: 'special', title: 'Особые', icon: 'sparkles-outline', range: [24, 30] },
  ];
  const [activeCategory, setActiveCategory] = useState('all');
  const selectedCategory = categories.find(item => item.key === activeCategory) || categories[0];
  const filteredAchievements = activeCategory === 'all'
    ? achievements
    : achievements.filter(item => item.id >= selectedCategory.range[0] && item.id <= selectedCategory.range[1]);
  const nextAchievement = achievements
    .filter(item => !item.unlocked)
    .sort((a, b) => (a.target - a.current) - (b.target - b.current))[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Достижения</Text>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* PROGRESS CARD */}
        <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.progressLabel}>ОБЩИЙ ПРОГРЕСС</Text>
            <Text style={styles.progressValue}>{unlockedCount} из {achievements.length}</Text>
          </View>
          <View style={styles.circularBox}>
             <Text style={styles.percentText}>{Math.round(totalProgress)}%</Text>
          </View>
        </View>

        {nextAchievement && (
          <View style={[styles.nextCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.nextIconBox, { backgroundColor: nextAchievement.color + '15' }]}>
              <Ionicons name={nextAchievement.icon} size={24} color={nextAchievement.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextLabel, { color: colors.textMuted }]}>Ближайшая цель</Text>
              <Text style={[styles.nextTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {nextAchievement.title}
              </Text>
              <Text style={[styles.nextDesc, { color: colors.textMuted }]} numberOfLines={2}>
                Осталось: {Math.max(nextAchievement.target - nextAchievement.current, 0)}
              </Text>
            </View>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {categories.map(category => {
            const isActive = activeCategory === category.key;
            return (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setActiveCategory(category.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={category.icon} size={15} color={isActive ? '#FFF' : colors.primary} />
                <Text style={[styles.categoryText, { color: isActive ? '#FFF' : colors.textPrimary }]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.listContainer}>
          {filteredAchievements.map((item) => (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: item.unlocked ? item.color : colors.border,
                  opacity: item.unlocked ? 1 : 0.7,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: item.unlocked ? item.color + '15' : colors.background },
                ]}
              >
                <Ionicons
                  name={item.unlocked ? item.icon : 'lock-closed'}
                  size={28}
                  color={item.unlocked ? item.color : colors.textMuted}
                />
              </View>

              <View style={styles.infoBox}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
                <Text style={[styles.itemDesc, { color: colors.textMuted }]}>
                  {item.desc}
                </Text>

                {/* Индикатор выполнения задачи */}
                {!item.unlocked && (
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: item.color,
                          width: `${Math.min((item.current / item.target) * 100, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>

              {item.unlocked && (
                <View style={[styles.checkCircle, { backgroundColor: item.color }]}>
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ==========================================
// СТИЛИ ИНТЕРФЕЙСА (ПОЛНОСТЬЮ ВЫРОВНЕНЫ)
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backBtn: {
    width: 45,
    height: 45,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  progressCard: {
    height: 140,
    borderRadius: 32,
    padding: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    overflow: 'hidden',
    elevation: 4,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  progressValue: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginTop: 5 },
  circularBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  percentText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  bgIcon: { position: 'absolute', right: -10, bottom: -20 },
  nextCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 16, elevation: 2 },
  nextIconBox: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  nextLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 3, textTransform: 'uppercase' },
  nextTitle: { fontSize: 16, fontWeight: '900' },
  nextDesc: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  categoryRow: { gap: 10, paddingBottom: 16 },
  categoryChip: { height: 38, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryText: { fontSize: 12, fontWeight: '900' },
  listContainer: { gap: 15 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 24,
    borderWidth: 1.5,
    position: 'relative',
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoBox: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemDesc: { fontSize: 12, lineHeight: 16 },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    marginTop: 10,
    width: '80%',
  },
  progressBarFill: { height: '100%', borderRadius: 2 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 15,
    right: 15,
  },
});

export default AchievementsScreen;

