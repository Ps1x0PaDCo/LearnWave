import React, { useContext, useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, 
  StatusBar, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import apiClient from '../services/api';
import Ionicons from '@expo/vector-icons/Ionicons';

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

const getCourseState = (topicCount) => {
  if (topicCount <= 0) {
    return {
      label: 'Скоро',
      meta: 'Материалы готовятся',
      ready: false,
      growing: false,
    };
  }
  if (topicCount < 3) {
    return {
      label: 'Пополняется',
      meta: 'Темы будут пополняться',
      ready: true,
      growing: true,
    };
  }
  return {
    label: 'Готово',
    meta: `${topicCount} ${getTopicWord(topicCount)}`,
    ready: true,
    growing: false,
  };
};

const CoursesScreen = ({ navigation }) => {
  const { isDarkMode, completedCourses } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);
  
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]); // Сюда прилетят категории из БД

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        console.log("?? [Courses] Запрос динамического каталога...");
        const response = await apiClient.get('/courses'); 
        
        if (response.data.success) {
          console.log("? [Courses] Структура каталога получена:", response.data.categories.length);
          const topicsResponse = await apiClient.get('/topics').catch(() => null);
          const topicsBySubject = {};
          if (Array.isArray(topicsResponse?.data?.topics)) {
            topicsResponse.data.topics.forEach(topic => {
              if (!topic.subject_key) return;
              topicsBySubject[topic.subject_key] = (topicsBySubject[topic.subject_key] || 0) + 1;
            });
          }
          const enrichedCatalog = response.data.categories.map(category => ({
            ...category,
            subjects: (category.subjects || []).map(subject => ({
              ...subject,
              topic_count: Math.max(
                Number(subject.topic_count || subject.topics_count || 0),
                topicsBySubject[subject.subject_key] || 0
              ),
            })),
          }));
          setCatalog(enrichedCatalog);
        }
      } catch (err) {
        console.log("? [Courses] Ошибка получения каталога:", err.message);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const handleSelect = (key, name) => {
    if (!key) return; 
    haptic.impact('medium'); // Исправлено: заменено с '\1'
    
    console.log(`?? [Navigation] Переход на визитку курса: ${name} (${key})`);
    
    navigation.navigate('SubjectSelection', { 
      subjectKey: key, 
      subjectName: name || 'Курс обучения'
    });
  };

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Каталог курсов</Text>
        <View style={{ width: 45 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textMuted }]}>Синхронизация направлений...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={[styles.mainDesc, { color: colors.textMuted }]}>
            Выберите интересующее вас направление для начала обучения
          </Text>

          {/* --- ПОЛНОСТЬЮ ДИНАМИЧЕСКИЙ ВЫВОД ИЗ БАЗЫ ДАННЫХ --- */}
          {catalog.map((category) => (
            <View key={category.id} style={styles.section}>
              {/* Заголовок категории (берется из PostgreSQL) */}
              <View style={styles.sectionHeader}>
                <View style={[styles.dot, { backgroundColor: category.color || colors.primary }]} />
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  {(category.title || 'Раздел').toUpperCase()}
                </Text>
              </View>
              
              {/* Список курсов внутри этой категории */}
              {category.subjects.map((sub) => {
                // Преобразуем строковые имена иконок в Emoji
                const emojiMap = {
                  'book': '📚',
                  'code': '💻',
                  'calculator': '🧮',
                  'flask': '🧪',
                  'school': '🏫',
                  'atom': '⚛️',
                  'brain': '🧠',
                  'flash': '⚡',
                  'leaf': '🌿',
                  'language': '🔤',
                  'globe': '🌍'
                };
                const currentEmoji = emojiMap[sub.icon_name] || '📖';
                const courseColor = sub.color || category.color || colors.primary;
                const topicCount = Number(sub.topic_count || sub.topics_count || 0);
                const courseState = getCourseState(topicCount);
                const isReady = courseState.ready;
                const completedCount = isReady
                  ? (completedCourses || []).filter(key => String(key).startsWith(`${sub.subject_key}_`)).length
                  : 0;
                const progressPercent = isReady ? Math.min((completedCount / topicCount) * 100, 100) : 0;

                return (
                  <TouchableOpacity 
                    key={sub.id}
                    style={[styles.subjectCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handleSelect(sub.subject_key, sub.title)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.iconBox, { backgroundColor: courseColor + '15' }]}>
                      <Text style={{ fontSize: 26 }}>{currentEmoji}</Text>
                    </View>
                    <View style={styles.subjectInfo}>
                      <View style={styles.subjectTopLine}>
                        <Text style={[styles.subjectName, { color: colors.textPrimary }]} numberOfLines={1}>{sub.title}</Text>
                        <View style={[
                          styles.statusPill,
                          {
                            backgroundColor: isReady ? courseColor + '18' : colors.background,
                            borderColor: isReady ? courseColor + '40' : colors.border,
                            maxWidth: courseState.growing ? 112 : 82,
                          }
                        ]}>
                          <Text style={[styles.statusText, { color: isReady ? courseColor : colors.textMuted }]}>
                            {courseState.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.subjectMeta, { color: colors.textMuted }]}>
                        {sub.description || 'Доступно для обучения'}
                      </Text>
                      <View style={styles.courseFooter}>
                        <Text style={[styles.courseCount, { color: colors.textMuted }]}>
                          {courseState.meta}
                        </Text>
                        {isReady && (
                          <Text style={[styles.courseCount, { color: colors.textMuted }]}>
                            {completedCount}/{topicCount} пройдено
                          </Text>
                        )}
                      </View>
                      <View style={[styles.courseTrack, { backgroundColor: isDarkMode ? '#2D3748' : '#EDF2F7' }]}>
                        <View style={[
                          styles.courseFill,
                          { width: `${progressPercent}%`, backgroundColor: isReady ? courseColor : colors.border }
                        ]} />
                      </View>
                    </View>
                    <View style={[styles.arrowBox, { backgroundColor: colors.background }]}>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  mainDesc: { fontSize: 14, marginBottom: 25, lineHeight: 20, opacity: 0.8 },
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginLeft: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  subjectCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 28, borderWidth: 1, marginBottom: 12, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  iconBox: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  subjectInfo: { flex: 1 },
  subjectTopLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  subjectName: { flex: 1, fontSize: 17, fontWeight: 'bold' },
  subjectMeta: { fontSize: 12, fontWeight: '500', opacity: 0.7, lineHeight: 16 },
  statusPill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '900' },
  courseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  courseCount: { fontSize: 11, fontWeight: '800' },
  courseTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 7 },
  courseFill: { height: '100%', borderRadius: 3 },
  arrowBox: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, fontSize: 14, fontWeight: '600' }
});

export default CoursesScreen;
