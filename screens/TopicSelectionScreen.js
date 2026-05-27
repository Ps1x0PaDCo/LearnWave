import React, { useContext, useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  StatusBar, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext, CoursesContext } from '../context/AuthContext'; 
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const TopicSelectionScreen = ({ route, navigation }) => {
  // 💡 ИСПРАВЛЕНО: Универсальный перехват параметров (защита от undefined)
  const params = route.params || {};
  const subjectKey = params.subjectKey || params.subject?.subject_key || 'math';
  const subjectTitle = params.subjectName || params.subject?.title || 'Выбор темы';

  const { isDarkMode } = useContext(AuthContext);
  const { completedCourses } = useContext(CoursesContext); // Массив ID пройденных тем
  const colors = getThemeColors(isDarkMode);

  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    const loadTopics = () => {
      try {
        // Выбираем темы из SQLite по нашему проверенному ключу
        const result = db.getAllSync(
          'SELECT id, title, description FROM topics WHERE subject_key = ? ORDER BY id ASC', 
          [subjectKey]
        );
        setTopics(result || []);
      } catch (e) {
        console.log('❌ Ошибка чтения тем из SQLite:', e.message);
        setTopics([]);
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, [subjectKey]);

  const handleTopicPress = (topic) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Content', { 
      topicId: topic.id, 
      topicTitle: topic.title,
      subjectKey: subjectKey 
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
        {/* 💡 ТЕПЕРЬ ТУТ ВСЕГДА ВЫВОДИТСЯ НАЗВАНИЕ КУРСА НА РУССКОМ */}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{subjectTitle}</Text>
        <View style={{ width: 45 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={[styles.mainDesc, { color: colors.textMuted }]}>
            Пройдите лекцию и успешно завершите тест, чтобы открыть следующий материал
          </Text>

          {topics.map((item, index) => {
            const isCompleted = completedCourses.includes(item.id);

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.topicCard, 
                  { backgroundColor: colors.surface, borderColor: isCompleted ? '#2ECC7150' : colors.border }
                ]}
                onPress={() => handleTopicPress(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.numberBox, { backgroundColor: isCompleted ? '#2ECC7115' : colors.background }]}>
                  <Text style={[styles.numberText, { color: isCompleted ? '#2ECC71' : colors.textMuted }]}>
                    {index + 1}
                  </Text>
                </View>

                <View style={styles.topicInfo}>
                  <Text style={[styles.topicTitleText, { color: colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.topicDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {item.description || 'Изучение теоретического материала и прохождение теста.'}
                  </Text>
                </View>

                <View style={[styles.statusBox, { backgroundColor: isCompleted ? '#2ECC71' : colors.background }]}>
                  <Ionicons 
                    name={isCompleted ? "checkmark" : "chevron-forward"} 
                    size={16} 
                    color={isCompleted ? "#FFF" : colors.primary} 
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  mainDesc: { fontSize: 14, marginBottom: 25, lineHeight: 20, opacity: 0.8 },
  topicCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, borderWidth: 1, marginBottom: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8 },
  numberBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  numberText: { fontSize: 15, fontWeight: 'bold' },
  topicInfo: { flex: 1, marginRight: 10 },
  topicTitleText: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  topicDesc: { fontSize: 12, lineHeight: 16 },
  statusBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default TopicSelectionScreen;
