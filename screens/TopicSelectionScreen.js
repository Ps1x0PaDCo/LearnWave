import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const TopicSelectionScreen = ({ route, navigation }) => {
  const { subject } = route.params || { subject: { subject_key: 'math', title: 'Курс' } };
  const { isDarkMode, completedCourses } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    const loadTopics = () => {
      try {
        // 💡 ИСПРАВЛЕНО: Запрашиваем только реально существующие колонки в SQLite
        const rows = db.getAllSync(
          'SELECT id, title, description, subject_key FROM topics WHERE subject_key = ? ORDER BY id ASC',
          [subject.subject_key]
        );
        setTopics(rows || []);
      } catch (e) {
        console.log('❌ Ошибка получения списка тем из SQLite:', e.message);
      } finally {
        setLoading(false);
      }
    };
    loadTopics();
  }, [subject.subject_key, completedCourses]);

  const handleTopicPress = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 💡 ИСПРАВЛЕНО: Генерируем правильный строковый ключ темы (например, math_1)
    const topicKey = `${item.subject_key}_${item.id}`;

    navigation.navigate('QuizScreen', {
      topicId: item.id,
      topicTitle: item.title,
      topicKey: topicKey
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {subject.title}
        </Text>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Выберите тему лекции для проверки знаний и прохождения тестирования
        </Text>

        {topics.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>В данном курсе пока нет доступных тем.</Text>
          </View>
        ) : (
          topics.map((item, index) => {

            const topicKey = `topic_${item.id}`;

            const isCompleted = completedCourses?.includes(topicKey) || false;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.topicCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isCompleted ? '#2ECC71' : colors.border
                  }
                ]}
                onPress={() => handleTopicPress(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.numberBadge, { backgroundColor: isCompleted ? '#2ECC7120' : colors.background }]}>
                    <Text style={[styles.numberText, { color: isCompleted ? '#2ECC71' : colors.textPrimary }]}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={styles.titleContainer}>
                    <Text style={[styles.topicTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.topicDesc, { color: colors.textMuted }]} numberOfLines={2}>
                      {item.description || 'Описание темы синхронизировано с сервером'}
                    </Text>
                  </View>

                  <View style={[
                    styles.statusBox,
                    { backgroundColor: isCompleted ? '#2ECC71' : colors.background }
                  ]}>
                    <Ionicons
                      name={isCompleted ? "checkmark" : "chevron-forward"}
                      size={16}
                      color={isCompleted ? "#FFF" : colors.primary}
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
  topicCard: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  numberBadge: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  numberText: { fontSize: 15, fontWeight: 'bold' },
  titleContainer: { flex: 1, paddingRight: 10 },
  topicTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  topicDesc: { fontSize: 12, lineHeight: 16 },
  statusBox: { width: 32, height: 32, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' }
});

export default TopicSelectionScreen;
