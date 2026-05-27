import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  StatusBar, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Keyboard 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext, CoursesContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const ContentScreen = ({ route, navigation }) => {
  // 💡 ИСПРАВЛЕНО: Безопасный универсальный прием параметров (защита от undefined)
  const params = route.params || {};
  const topicId = params.topicId || 1;
  const topicTitle = params.topicTitle || 'Лекция';

  const { isDarkMode, user } = useContext(AuthContext);
  const { completedCourses } = useContext(CoursesContext); 
  const colors = getThemeColors(isDarkMode);

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  
  // Состояния для закладок и заметок (Твоя оригинальная логика)
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const username = user?.username || 'guest';

  useEffect(() => {
    const loadData = () => {
      try {
        // 1. Загружаем основной текст лекции
        const row = db.getFirstSync('SELECT content, description FROM topics WHERE id = ?', [topicId]);
        if (row) {
          setContent(row.content || 'Текст лекции находится в разработке...');
          setDescription(row.description || '');
        }

        // 2. Проверяем, находится ли лекция в закладках у текущего юзера
        const bookmarkRow = db.getFirstSync(
          'SELECT id FROM bookmarks WHERE username = ? AND topic_id = ?', 
          [username, topicId]
        );
        setIsBookmarked(!!bookmarkRow);

        // 3. Загружаем сохраненную заметку пользователя к этой лекции
        const noteRow = db.getFirstSync(
          'SELECT content FROM notes WHERE username = ? AND topic_id = ?', 
          [username, topicId]
        );
        setNoteText(noteRow?.content || '');

      } catch (e) {
        console.log('❌ Ошибка SQLite на экране лекции:', e.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [topicId, username]);

  // Переключение состояния закладки (ИСПРАВЛЕНО под topic_id)
  const handleToggleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (isBookmarked) {
        db.runSync('DELETE FROM bookmarks WHERE username = ? AND topic_id = ?', [username, topicId]);
        setIsBookmarked(false);
      } else {
        db.runSync('INSERT OR IGNORE INTO bookmarks (username, topic_id) VALUES (?, ?)', [username, topicId]);
        setIsBookmarked(true);
      }
    } catch (e) {
      console.log('❌ Ошибка работы с закладками:', e.message);
    }
  };

  // Сохранение текста заметки в SQLite (ИСПРАВЛЕНО под topic_id)
  const handleSaveNote = () => {
    Keyboard.dismiss();
    setIsSavingNote(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      db.runSync(
        'INSERT OR REPLACE INTO notes (username, topic_id, content) VALUES (?, ?, ?)',
        [username, topicId, noteText.trim()]
      );
    } catch (e) {
      console.log('❌ Ошибка сохранения заметки:', e.message);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleStartQuiz = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('QuizScreen', { topicId, topicTitle });
  };

  const isCompleted = completedCourses.includes(topicId);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* HEADER С КНОПКОЙ ЗАКЛАДКИ */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {topicTitle}
          </Text>

          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
            onPress={handleToggleBookmark}
          >
            <Ionicons 
              name={isBookmarked ? "bookmark" : "bookmark-outline"} 
              size={22} 
              color={isBookmarked ? "#F1C40F" : colors.textPrimary} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* КРАТКОЕ ОПИСАНИЕ */}
          {description ? (
            <View style={[styles.descBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.descText, { color: colors.textMuted }]}>{description}</Text>
            </View>
          ) : null}

          {/* ОСНОВНОЙ ТЕКСТ ЛЕКЦИИ */}
          <Text style={[styles.lectureText, { color: colors.textPrimary }]}>
            {content.replace(/\\n/g, '\n')}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* БЛОК ЛОКАЛЬНЫХ ЗАМЕТОК СТУДЕНТА */}
          <View style={[styles.notesSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.notesHeader}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={[styles.notesTitle, { color: colors.textPrimary }]}>Мои личные заметки</Text>
            </View>
            <TextInput
              style={[styles.notesInput, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Запишите сюда важные формулы, мысли или шпаргалки к этой лекции..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={noteText}
              onChangeText={setNoteText}
            />
            <TouchableOpacity 
              style={[styles.saveNoteBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveNote}
              disabled={isSavingNote}
            >
              <Text style={styles.saveNoteBtnText}>
                {isSavingNote ? 'Сохранение...' : 'Сохранить заметку'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* НИЖНЯЯ ПАНЕЛЬ С КНОПКОЙ ТЕСТА */}
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          {isCompleted ? (
            <View style={[styles.completedBadge, { backgroundColor: '#2ECC7115', borderColor: '#2ECC7140' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#2ECC71" style={{ marginRight: 8 }} />
              <Text style={{ color: '#2ECC71', fontWeight: 'bold', fontSize: 15 }}>Тема успешно пройдена!</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.quizBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={handleStartQuiz}
            >
              <Text style={styles.quizBtnText}>Проверить знания (Тест)</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 10 },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 },
  descBox: { padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 20, borderStyle: 'dashed' },
  descText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  lectureText: { fontSize: 16, lineHeight: 26, fontWeight: '500' },
  divider: { height: 1, marginVertical: 25, width: '100%' },
  notesSection: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  notesTitle: { fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  notesInput: { minHeight: 80, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, textAlignVertical: 'top', marginBottom: 12 },
  saveNoteBtn: { height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveNoteBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  footer: { padding: 20, position: 'absolute', bottom: 0, width: '100%' },
  quizBtn: { height: 58, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', elevation: 3 },
  quizBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  completedBadge: { height: 58, borderRadius: 20, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
}); export default ContentScreen;