import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient from '../services/api';

// ─── Haptics: безопасная обёртка для веба ────────────────────────────────────
const haptic = {
  impact: (style) => {
    if (Platform.OS !== 'web') {
      const Haptics = require('expo-haptics');
      Haptics.impactAsync(style);
    }
  },
};

const TopicSelectionScreen = ({ route, navigation }) => {
  const { subject } = route.params || { subject: { subject_key: 'math', title: 'Курс' } };
  const { isDarkMode, completedCourses } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    const loadTopics = async () => {
      try {
        let rows = [];

        if (Platform.OS === 'web') {
          // На вебе SQLite недоступен — запрашиваем темы с сервера
          const res = await apiClient.get(`/topics?subject_key=${subject.subject_key}`).catch(() => null);
          if (res?.data?.success && Array.isArray(res.data.topics)) {
            rows = res.data.topics;
          }
        } else {
          // Нативный режим — читаем из SQLite (offline-first)
          rows = db.getAllSync(
            'SELECT id, title, description, content, subject_key FROM topics WHERE subject_key = ? ORDER BY id ASC',
            [subject.subject_key]
          ) || [];
        }

        setTopics(rows);
      } catch (e) {
        console.log('❌ [TopicSelection] Error:', e.message);
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, [subject.subject_key, completedCourses]);

  const handleTopicPress = (item) => {
    haptic.impact('Light');
    navigation.navigate('QuizScreen', {
      topicId: item.id,
      topicTitle: item.title,
      topicContent: item.content,
      subjectKey: item.subject_key,
      topicKey: `${item.subject_key}_${item.id}`,
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Прогресс по курсу
  const completedInThisSubject = topics.filter(item => {
    return completedCourses?.includes(`${item.subject_key}_${item.id}`) ||
           (!item.subject_key && completedCourses?.includes(`topic_${item.id}`));
  }).length;
  const percentage = topics.length > 0
    ? Math.round((completedInThisSubject / topics.length) * 100)
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {subject.title}
        </Text>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Выберите тему лекции для проверки знаний и прохождения тестирования
        </Text>

        {/* Прогресс-бар курса */}
        {topics.length > 0 && (
          <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textPrimary }]}>📊 ИЗУЧЕНО МАТЕРИАЛА</Text>
              <Text style={[styles.progressPercent, { color: colors.primary }]}>{percentage}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: isDarkMode ? '#2D3748' : '#EDF2F7' }]}>
              <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.progressSub, { color: colors.textMuted }]}>
              Пройдено: {completedInThisSubject} из {topics.length}
            </Text>
          </View>
        )}

        {/* Список тем */}
        {topics.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name="sparkles-outline" size={34} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Темы готовятся</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Этот курс уже есть в каталоге. Материалы появятся здесь после наполнения через административную панель.
            </Text>
          </View>
        ) : (
          topics.map((item, idx) => {
            const isCompleted = completedCourses?.includes(`${item.subject_key}_${item.id}`) ||
                                (!item.subject_key && completedCourses?.includes(`topic_${item.id}`));
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.topicCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleTopicPress(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.numberBadge, { backgroundColor: isDarkMode ? '#2D3748' : '#EDF2F7' }]}>
                    <Text style={[styles.numberText, { color: colors.primary }]}>{idx + 1}</Text>
                  </View>
                  <View style={styles.titleContainer}>
                    <Text style={[styles.topicTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.topicDesc, { color: colors.textMuted }]} numberOfLines={2}>
                      {item.description || 'Описание лекционного материала...'}
                    </Text>
                  </View>
                  <View style={[styles.statusBox, {
                    backgroundColor: isCompleted ? '#2ECC7120' : (isDarkMode ? '#1A202C' : '#F7FAFC'),
                    borderWidth: isCompleted ? 0 : 1,
                    borderColor: colors.border,
                  }]}>
                    <Ionicons
                      name={isCompleted ? 'checkmark-circle' : 'book-outline'}
                      size={18}
                      color={isCompleted ? '#2ECC71' : colors.textMuted}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  subtitle: { fontSize: 14, marginBottom: 25, lineHeight: 20, opacity: 0.8 },
  progressCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  progressPercent: { fontSize: 14, fontWeight: '900' },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressSub: { fontSize: 11, fontWeight: '600', marginTop: 8 },
  emptyBox: { alignItems: 'center', padding: 28, borderRadius: 24, borderWidth: 1, marginTop: 20 },
  emptyIconBox: { width: 74, height: 74, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  topicCard: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  numberBadge: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  numberText: { fontSize: 15, fontWeight: 'bold' },
  titleContainer: { flex: 1, paddingRight: 10 },
  topicTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  topicDesc: { fontSize: 12, lineHeight: 16 },
  statusBox: { width: 32, height: 32, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
});

export default TopicSelectionScreen;
