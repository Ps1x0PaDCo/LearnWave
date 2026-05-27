import React, { useContext, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, 
  Dimensions, TextInput, Alert, Modal, StatusBar, Platform 
} from 'react-native';
import { Image } from 'expo-image';
import ConfettiCannon from 'react-native-confetti-cannon';
import { AuthContext, CoursesContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ContentScreen = ({ route, navigation }) => {
  const { topic } = route.params;
  const { isDarkMode, nickname, completeTopic, toggleBookmark, executeRaw } = useContext(AuthContext);
  const { completedCourses } = useContext(CoursesContext);
  const colors = getThemeColors(isDarkMode);
  
  const [isB, setIsB] = useState(false);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [rate, setRate] = useState(0);
  const conf = useRef(null);

  const isAlreadyDone = useMemo(() => 
    (completedCourses || []).includes(topic.title), 
  [completedCourses, topic.title]);

  // Проверка наличия квиза в данных темы
  const hasQuiz = useMemo(() => !!(topic.quiz_question && topic.quiz_answer), [topic]);

  useEffect(() => {
    if (executeRaw) {
      const n = executeRaw('SELECT content FROM notes WHERE username = ? AND topic_title = ?', [nickname, topic.title]);
      if (n?.length > 0) setNote(n[0].content);
      
      const b = executeRaw('SELECT id FROM bookmarks WHERE username = ? AND topic_title = ?', [nickname, topic.title]);
      setIsB(b?.length > 0);
    }
  }, [nickname, topic.title]);

  const saveNote = () => {
    executeRaw('INSERT OR REPLACE INTO notes (username, topic_title, content) VALUES (?, ?, ?)', [nickname, topic.title, note]);
    setShowNote(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderedContent = useMemo(() => {
    if (!topic.content) return null;
    const parts = topic.content.split(/(\[FORMULA\].*?\[\/FORMULA\]|\[IMPORTANT\].*?\[\/IMPORTANT\]|\[IMAGE\].*?\[\/IMAGE\]|### .*?\n)/gs);

    return parts.map((part, idx) => {
      if (!part || part.trim() === '') return null;
      if (part.startsWith('[IMAGE]')) {
        const url = part.replace(/\[\/?IMAGE\]/g, '').trim();
        return (
          <View key={`img-${idx}`} style={styles.imageWrapper}>
            <Image source={{ uri: url }} style={styles.lectureImage} contentFit="contain" transition={500} />
            <Text style={[styles.imageCaption, { color: colors.textMuted }]}>Иллюстрация к теме</Text>
          </View>
        );
      }
      if (part.startsWith('###')) return <Text key={`h3-${idx}`} style={[styles.h3, { color: colors.primary }]}>{part.replace('###', '').trim()}</Text>;
      if (part.startsWith('[FORMULA]')) return (
        <View key={`form-${idx}`} style={[styles.formulaCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
          <Text style={[styles.formulaText, { color: colors.textPrimary }]}>{part.replace(/\[\/?FORMULA\]/g, '').trim()}</Text>
        </View>
      );
      if (part.startsWith('[IMPORTANT]')) return (
        <View key={`imp-${idx}`} style={[styles.importantCard, { backgroundColor: isDarkMode ? '#2D3748' : '#FFF5F5' }]}>
          <View style={styles.importantHeader}><Ionicons name="alert-circle" size={18} color="#E53E3E" /><Text style={styles.importantLabel}>ВАЖНОЕ ПРАВИЛО</Text></View>
          <Text style={[styles.importantText, { color: colors.textPrimary }]}>{part.replace(/\[\/?IMPORTANT\]/g, '').trim()}</Text>
        </View>
      );
      return <Text key={`txt-${idx}`} style={[styles.paragraph, { color: colors.textPrimary }]}>{part.trim()}</Text>;
    });
  }, [topic.content, colors, isDarkMode]);


  const handleFinish = useCallback(async () => {
    if (isAlreadyDone) {
      Alert.alert("Информация", "Вы уже изучили эту тему.");
      return;
    }

    // Если есть квиз — идем на экран теста (логику синхронизации добавим там)
    if (hasQuiz) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('QuizScreen', { topic });
    } else {
      // ЕСЛИ КВИЗА НЕТ — СИНХРОНИЗИРУЕМ СРАЗУ
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // 1. Сохраняем локально (SQLite)
        completeTopic(nickname, topic.title); 
        
        // 2. Отправляем в облако (PostgreSQL)
        // ВНИМАНИЕ: убедись, что в объекте topic есть id из базы данных
        await apiClient.post('/progress', { topic_id: topic.id });

        conf.current?.start(); 
        Alert.alert("Успех!", "Прогресс сохранен в облаке и на устройстве.");
      } catch (error) {
        // Если интернета нет, всё равно зачтем локально
        completeTopic(nickname, topic.title);
        Alert.alert("Оффлайн-режим", "Сохранено локально. Синхронизация произойдет позже.");
      }
    }
  }, [isAlreadyDone, hasQuiz, nickname, topic, completeTopic, navigation]);


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowNote(true)} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { toggleBookmark(nickname, topic.title, isB); setIsB(!isB); }} style={styles.iconBtn}>
            <Ionicons name={isB ? "bookmark" : "bookmark-outline"} size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>{topic.title}</Text>
        <View style={[styles.accentLine, { backgroundColor: colors.primary }]} />

        <View style={styles.contentBody}>{renderedContent}</View>
        
        <TouchableOpacity 
          style={[styles.finishBtn, { backgroundColor: isAlreadyDone ? '#2ECC71' : colors.primary }]} 
          onPress={handleFinish}
        >
          <Text style={styles.finishBtnText}>
            {isAlreadyDone ? 'Тема изучена' : (hasQuiz ? 'Перейти к тесту' : 'Завершить изучение')}
          </Text>
          <Ionicons name={isAlreadyDone ? "checkmark-done" : (hasQuiz ? "help-circle" : "checkmark-circle")} size={22} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.ratingBox}>
          <Text style={[styles.rateLabel, { color: colors.textMuted }]}>ОЦЕНИТЕ МАТЕРИАЛ</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity key={s} onPress={() => { setRate(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <Ionicons name={rate >= s ? "star" : "star-outline"} size={32} color="#F1C40F" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showNote} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalT, { color: colors.textPrimary }]}>Твоя заметка</Text>
            <TextInput multiline placeholder="Запиши что-то важное..." placeholderTextColor={colors.textMuted} value={note} onChangeText={setNote} style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border }]} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowNote(false)}><Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Отмена</Text></TouchableOpacity>
              <TouchableOpacity onPress={saveNote} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={styles.saveBtnText}>Сохранить</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ConfettiCannon ref={conf} count={60} origin={{x: width/2, y: -20}} autoStart={false} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, alignItems: 'center' },
  headerRight: { flexDirection: 'row', gap: 15 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 25, paddingBottom: 60 },
  mainTitle: { fontSize: 30, fontWeight: 'bold', marginTop: 10 },
  accentLine: { height: 5, width: 50, borderRadius: 3, marginVertical: 20 },
  contentBody: { marginTop: 5 },
  paragraph: { fontSize: 17, lineHeight: 28, marginBottom: 20, letterSpacing: 0.2 },
  h3: { fontSize: 22, fontWeight: 'bold', marginTop: 10, marginBottom: 15 },
  imageWrapper: { marginVertical: 20, borderRadius: 20, overflow: 'hidden', elevation: 3 },
  lectureImage: { width: '100%', height: 250 },
  imageCaption: { fontSize: 12, textAlign: 'center', paddingVertical: 8, fontStyle: 'italic' },
  formulaCard: { padding: 20, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', marginVertical: 20, alignItems: 'center' },
  formulaText: { fontSize: 20, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  importantCard: { padding: 20, borderRadius: 20, borderLeftWidth: 5, borderLeftColor: '#E53E3E', marginVertical: 20 },
  importantHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  importantLabel: { fontSize: 10, fontWeight: 'bold', color: '#E53E3E', letterSpacing: 1 },
  importantText: { fontSize: 16, fontWeight: '600', fontStyle: 'italic' },
  finishBtn: { height: 65, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 40, elevation: 4 },
  finishBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  ratingBox: { marginTop: 40, alignItems: 'center', paddingVertical: 30, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  rateLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 15 },
  stars: { flexDirection: 'row', gap: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  modalBox: { padding: 25, borderRadius: 30, elevation: 10 },
  modalT: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalInput: { height: 150, borderWidth: 1.5, borderRadius: 15, padding: 15, textAlignVertical: 'top', fontSize: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' }
});

export default ContentScreen;

