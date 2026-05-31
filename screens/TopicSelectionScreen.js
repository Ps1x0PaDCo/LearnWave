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
        const rows = db.getAllSync(
          // 🌟 ИСПРАВЛЕНО: Добавили выборку поля content, чтобы лекция больше не открывалась пустой!
          'SELECT id, title, description, content, subject_key FROM topics WHERE subject_key = ? ORDER BY id ASC',
          [subject.subject_key]
        );
        setTopics(rows || []);
        
        console.log('📱 [DEBUG] completedCourses в стейте сейчас:', completedCourses);
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
    const topicKey = `${item.subject_key}_${item.id}`;
    
    // 💡 Передаем чистый текст лекции на экран чтения/квиза
    navigation.navigate('QuizScreen', {
      topicId: item.id,
      topicTitle: item.title,
      topicContent: item.content, // 🌟 ДОБАВИЛИ СЮДА!
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
      
      {/* 📋 ШАПКА ПРЕДМЕТА */}
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

        {/* 🌟 ДИНАМИЧЕСКИЙ ПРОГРЕСС-БАР КУРСА */}
        {topics.length > 0 && (() => {
          const completedInThisSubject = topics.filter(item => {
            const defaultKey = `topic_${item.id}`;
            const subjectKey = `${item.subject_key}_${item.id}`;
            return completedCourses?.includes(defaultKey) || completedCourses?.includes(subjectKey);
          }).length;

          const percentage = Math.round((completedInThisSubject / topics.length) * 100) || 0;

          return (
            <View style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 20,
              padding: 16,
              marginBottom: 20,
              elevation: 2,
              shadowColor: '#000',
              shadowOpacity: 0.01,
              shadowRadius: 4
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.3 }}>
                  📊 ИЗУЧЕНО МАТЕРИАЛА
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#4A90E2' }}>
                  {percentage}%
                </Text>
              </View>

              {/* Задняя подложка трека прогресса */}
              <View style={{ width: '100%', height: 8, backgroundColor: isDarkMode ? '#2D3748' : '#EDF2F7', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ 
                  width: `${percentage}%`, 
                  height: '100%', 
                  backgroundColor: '#4A90E2', 
                  borderRadius: 4
                }} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 8 }}>
                Пройдено лекций: {completedInThisSubject} из {topics.length}
              </Text>
            </View>
          );
        })()}

        {/* 🌟 СПИСОК 10 ЛЕКЦИЙ С ГАЛОЧКАМИПРОХОЖДЕНИЯ */}
        {topics.map((item, idx) => {
          const defaultKey = `topic_${item.id}`;
          const subjectKey = `${item.subject_key}_${item.id}`;
          const isCompleted = completedCourses?.includes(defaultKey) || completedCourses?.includes(subjectKey) || false;

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
                  borderColor: colors.border
                }]}>
                  <Ionicons 
                    name={isCompleted ? "checkmark-circle" : "book-outline"} 
                    size={18} 
                    color={isCompleted ? "#2ECC71" : colors.textMuted} 
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  statusBox: { width: 32, height: 32, borderRadius: 11, justifyContent: 'center', alignItems: 'center' }
});

export default TopicSelectionScreen;

