import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
  Animated, StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient from '../services/api';

// ─── Haptics: безопасная обёртка (не падает на вебе) ─────────────────────────
const haptic = {
  impact: (style) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.impactAsync(style); } },
  notification: (type) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.notificationAsync(type); } },
};

const getTopicWord = (count) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return 'тема';
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return 'темы';
  return 'тем';
};

const getCourseAvailability = (topicCount) => {
  if (topicCount <= 0) {
    return {
      label: 'РАЗДЕЛ В КАТАЛОГЕ',
      topicsText: 'Материалы готовятся',
      timeText: 'Скоро',
      buttonText: 'Посмотреть раздел',
    };
  }
  if (topicCount < 3) {
    return {
      label: 'ТЕМЫ БУДУТ ПОПОЛНЯТЬСЯ',
      topicsText: `Доступно: ${topicCount} ${getTopicWord(topicCount)}`,
      timeText: 'Пополняется',
      buttonText: 'Начать изучение',
    };
  }
  return {
    label: 'ОБУЧЕНИЕ ДОСТУПНО',
    topicsText: `Доступно: ${topicCount} ${getTopicWord(topicCount)}`,
    timeText: `~${topicCount * 6} мин`,
    buttonText: 'Начать изучение',
  };
};



const SubjectSelectionScreen = ({ route, navigation }) => {
  // Вытаскиваем параметры навигации с дефолтными значениями на чистом русском языке
  const { subjectKey, subjectName } = route.params || { 
    subjectKey: 'math', 
    subjectName: 'Курс обучения' 
  };
  
  const { isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);
  
  const [topicCount, setTopicCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // 💡 ИСПРАВЛЕНО: Безопасный маппинг иконок под все типы предметов, включая базовую математику
  const iconMap = {
    'math': 'calculator-outline',
    'advanced_math': 'calculator-outline',
    'base_math': 'calculator-outline', // Добавили поддержку базовой математики
    'physics': 'flash-outline',
    'chemistry': 'flask-outline',
    'biology': 'leaf-outline',
    'history': 'library-outline',
    'geography': 'earth-outline',
    'english': 'language-outline',
    'programming': 'code-working-outline',
    'python_dev': 'code-working-outline',
    'web_dev': 'globe-outline',
  };

  const descMap = {
    math: 'Ключевые формулы, понятные объяснения и короткая проверка после каждой темы.',
    physics: 'Законы, величины и практический смысл формул в задачах и реальных ситуациях.',
    python_dev: 'Практические основы программирования: от переменных до первых алгоритмов.',
    chemistry: 'Курс добавлен в каталог, материалы по атомам и реакциям готовятся.',
    biology: 'Курс добавлен в каталог, темы по клетке и организму готовятся.',
    history: 'Курс добавлен в каталог, краткие исторические модули готовятся.',
    geography: 'Курс добавлен в каталог, темы по картам и природным зонам готовятся.',
    english: 'Курс добавлен в каталог, темы по лексике и грамматике готовятся.',
  };

  const current = {
    title: subjectName || 'Выбор темы',
    desc: descMap[subjectKey] || 'Изучение основ направления и практические интерактивные задания',
    icon: iconMap[subjectKey] || 'school-outline',
    color: colors.primary
  };
  const availability = getCourseAvailability(topicCount);

  useEffect(() => {
    // Красивая плавная анимация появления карточки предмета
    Animated.spring(scaleAnim, { 
      toValue: 1, 
      friction: 4, 
      useNativeDriver: true 
    }).start();

    const fetchStats = async () => {
      try {
        if (Platform.OS === 'web') {
          const res = await apiClient.get(`/topics?subject_key=${subjectKey}`).catch(() => null);
          setTopicCount(Array.isArray(res?.data?.topics) ? res.data.topics.length : 0);
        } else {
          const result = db.getFirstSync(
            'SELECT COUNT(*) as count FROM topics WHERE subject_key = ?',
            [subjectKey]
          );
          setTopicCount(result?.count || 0);
        }
      } catch (e) {
        console.log('❌ Ошибка SQLite при подсчете тем лекций:', e.message);
        setTopicCount(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [subjectKey]);

  const handleOpenTopics = () => {
    haptic.impact('medium');
    navigation.navigate('TopicSelection', {
      subject: { subject_key: subjectKey, title: current.title }
    });
  };

  const handleDownloadCourse = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Офлайн-доступ', 'Офлайн-сохранение доступно в мобильной версии приложения.');
      return;
    }
    setIsDownloading(true);
    try {
      const res = await apiClient.get(`/topics?subject_key=${subjectKey}`);
      const topics = Array.isArray(res?.data?.topics) ? res.data.topics : [];
      if (topics.length === 0) {
        Alert.alert('Тем пока нет', 'В этом курсе ещё нет материалов для офлайн-сохранения.');
        return;
      }

      db.runSync('INSERT OR IGNORE INTO courses (title, subject_key) VALUES (?, ?)', [current.title, subjectKey]);
      topics.forEach(topic => {
        db.runSync(
          `INSERT OR REPLACE INTO topics
            (id, server_id, subject_key, title, description, content, quiz_question, quiz_answer, difficulty, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            topic.id,
            topic.server_id || topic.id,
            topic.subject_key || subjectKey,
            topic.title || 'Тема',
            topic.description || '',
            topic.content || '',
            topic.quiz_question || '',
            topic.quiz_answer || '',
            topic.difficulty || 1,
          ]
        );
      });
      setTopicCount(topics.length);
      haptic.notification('medium');
      Alert.alert('Курс сохранён', `На устройство загружено тем: ${topics.length}. Теперь их можно открыть без интернета.`);
    } catch (e) {
      Alert.alert('Не удалось скачать', 'Проверьте подключение к серверу и попробуйте ещё раз.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        {/* 💡 ТЕПЕРЬ ТУТ ВСЕГДА КРАСИВОЕ РУССКОЕ НАЗВАНИЕ КУРСА */}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{current.title}</Text>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Animated.View style={[styles.iconCircle, { backgroundColor: current.color + '15', transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name={current.icon} size={70} color={current.color} />
          </Animated.View>

          <Text style={[styles.subjectLabel, { color: current.color }]}>
            {availability.label}
          </Text>
          <Text style={[styles.cardDesc, { color: colors.textPrimary }]}>{current.desc}</Text>

          <View style={styles.courseFacts}>
          <View style={[styles.infoBadge, { backgroundColor: colors.background }]}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="layers-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.infoBadgeText, { color: colors.textMuted }]}>
                  {availability.topicsText}
                </Text>
              </>
            )}
          </View>
          <View style={[styles.infoBadge, { backgroundColor: colors.background }]}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoBadgeText, { color: colors.textMuted }]}>
              {availability.timeText}
            </Text>
          </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: current.color }]}
          activeOpacity={0.8}
          onPress={handleOpenTopics}
        >
          <Text style={styles.buttonText}>{availability.buttonText}</Text>
          <View style={styles.btnIconCircle}>
            <Ionicons name="arrow-forward" size={18} color={current.color} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.offlineButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.85}
          onPress={handleDownloadCourse}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={current.color} />
          ) : (
            <Ionicons name="download-outline" size={20} color={current.color} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.offlineButtonTitle, { color: colors.textPrimary }]}>
              {topicCount > 0 ? 'Обновить офлайн-копию' : 'Скачать для офлайн-доступа'}
            </Text>
            <Text style={[styles.offlineButtonSub, { color: colors.textMuted }]}>
              Темы сохранятся на устройстве и откроются без сети
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  mainCard: { borderRadius: 35, padding: 40, alignItems: 'center', borderWidth: 1, elevation: 5, shadowOpacity: 0.05, shadowRadius: 15, marginBottom: 30 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  subjectLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  cardDesc: { fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 30, marginBottom: 25 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  courseFacts: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  infoBadgeText: { fontSize: 13, fontWeight: 'bold', marginLeft: 8 },
  primaryButton: { height: 65, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, elevation: 4 },
  offlineButton: { minHeight: 64, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 12, marginTop: 12 },
  offlineButtonTitle: { fontSize: 15, fontWeight: '900' },
  offlineButtonSub: { fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2 },
  btnIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' }
});

export default SubjectSelectionScreen;
