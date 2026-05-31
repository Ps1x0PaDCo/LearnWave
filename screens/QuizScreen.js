import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import apiClient from '../services/api';

const QuizScreen = ({ route, navigation }) => {
  const { topicId, topicTitle, topicKey } = route.params || { topicId: 1, topicTitle: 'Тест', topicKey: 'topic_1' };
  const { isDarkMode, completeTopic, user, setUser } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [visibleOptions, setVisibleOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  
  // 🌟 ДОБАВИЛИ: Стейт для хранения текста лекции
  const [lectureContent, setLectureContent] = useState('');

  useEffect(() => {
    const loadQuiz = () => {
      try {
        // 🛠️ ИСПРАВЛЕНО: Вытягиваем quiz_question И content из SQLite одним запросом!
        const row = db.getFirstSync('SELECT quiz_question, content FROM topics WHERE id = ?', [topicId]);
        
        // Сохраняем теорию в стейт
        setLectureContent(row?.content || 'Текст лекции синхронизируется...');

        if (row?.quiz_question) {
          const parsed = JSON.parse(row.quiz_question);
          setQuizData(parsed);
          setVisibleOptions(parsed.options);
        } else {
          const defaultQuiz = {
            question: `Вы изучили тему "${topicTitle}". Подтвердите, что материал усвоен!`,
            options: ["Материал усвоен полностью!", "Нужно еще повторить"],
            correct: "Материал усвоен полностью!"
          };
          setQuizData(defaultQuiz);
          setVisibleOptions(defaultQuiz.options);
        }
      } catch (e) {
        console.log('❌ Ошибка парсинга теста:', e.message);
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [topicId, topicTitle]);

  const handleOptionPress = (option) => {
    if (isAnswered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(option);
  };

  // 💡 ФИЧА: Логика подсказки 50/50 (Убирает 2 неверных ответа за 30 монет)
  const useHint5050 = async () => {
    if (hintUsed || isAnswered) return;

    // Защита: не даем тратить монеты впустую, если вариантов и так мало
    if (!quizData || quizData.options.length <= 2) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Подсказка недоступна 💡', 'В этом вопросе слишком мало вариантов ответа, подсказка не требуется.');
      return;
    }

    const hintPrice = 30;
    if ((user?.balance || 0) < hintPrice) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Недостаточно монет 🪙', 'У вас не хватает монет для покупки подсказки.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await apiClient.post('/api/shop/buy', {
        item_type: 'quiz_hint',
        item_value: 'used_in_quiz',
        price: hintPrice
      });

      if (res.data.success) {
        setUser(prev => prev ? { ...prev, balance: res.data.newBalance } : null);

        const correctAnswer = quizData.correct;
        const incorrectAnswers = quizData.options.filter(opt => opt !== correctAnswer);

        // Выбираем один случайный неверный ответ
        const randomIncorrect = incorrectAnswers[Math.floor(Math.random() * incorrectAnswers.length)];

        // Перемешиваем их, чтобы правильный ответ не всегда стоял на первом месте
        const newOptions = [correctAnswer, randomIncorrect].sort(() => Math.random() - 0.5);

        setVisibleOptions(newOptions);
        setHintUsed(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось активировать подсказку.');
    }
  };

  const checkAnswer = () => {
    if (!selectedOption || isAnswered) return;

    const correct = selectedOption === quizData.correct;
    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Исправлено: передаем никнейм, строковый ключ для SQLite и числовой ID для Postgres
      const finalKey = route.params?.topicKey || `topic_${topicId}`;
      completeTopic(user?.username, finalKey, topicId);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Проверка знаний</Text>

        {/* Кнопка 50/50 */}
        <TouchableOpacity
          style={[styles.hintBtn, {
            backgroundColor: hintUsed ? colors.border : colors.primary + '15',
            opacity: hintUsed || isAnswered ? 0.6 : 1
          }]}
          onPress={useHint5050}
          disabled={hintUsed || isAnswered}
        >
          <Text style={[styles.hintText, { color: hintUsed ? colors.textMuted : colors.primary }]}>50/50 🪙30</Text>
        </TouchableOpacity>
      </View>

          {/* 🌟 ИСПРАВЛЕНО: Обернули в ScrollView, чтобы лекция и квиз плавно прокручивались */}
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* 📖 БЛОК 1: ТЕОРЕТИЧЕСКИЙ МАТЕРИАЛ (Твой глубокий peer-to-peer контент) */}
      <View style={{
        backgroundColor: colors.surface,
        padding: 22,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
        marginTop: 10
      }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: colors.primary, letterSpacing: 1.5, marginBottom: 10 }}>
          📚 ТЕОРЕТИЧЕСКИЙ МАТЕРИАЛ
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 23, color: colors.textPrimary }}>
          {lectureContent}
        </Text>
      </View>

      {/* ❓ БЛОК 2: ПРОВЕРКА ЗНАНИЙ (Тестирование) */}
      <View style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 0 }]}>
        <Text style={{ fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1, marginBottom: 6, textAlign: 'center' }}>
          КОНТРОЛЬНЫЙ ВОПРОС:
        </Text>
        <Text style={[styles.questionText, { color: colors.textPrimary }]}>{quizData?.question}</Text>
      </View>

      {/* OPTIONS LIST */}
      <View style={styles.optionsContainer}>
        {visibleOptions.map((option, index) => {
          const isSelected = selectedOption === option;
          let btnStyle = { backgroundColor: colors.surface, borderColor: colors.border };
          let textStyle = { color: colors.textPrimary };
          
          if (isSelected) {
            btnStyle.borderColor = colors.primary;
            btnStyle.backgroundColor = colors.primary + '10';
          }
          if (isAnswered) {
            if (option === quizData.correct) {
              btnStyle.borderColor = '#2ECC71';
              btnStyle.backgroundColor = '#2ECC7120';
              textStyle.color = '#2ECC71';
            } else if (isSelected && !isCorrect) {
              btnStyle.borderColor = '#E74C3C';
              btnStyle.backgroundColor = '#E74C3C20';
              textStyle.color = '#E74C3C';
            }
          }
          return (
            <TouchableOpacity
              key={index}
              style={[styles.optionButton, btnStyle]}
              onPress={() => handleOptionPress(option)}
              disabled={isAnswered}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, textStyle]}>{option}</Text>
              {isAnswered && option === quizData.correct && (
                <Ionicons name="checkmark-circle" size={22} color="#2ECC71" />
              )}
              {isAnswered && isSelected && !isCorrect && (
                <Ionicons name="close-circle" size={22} color="#E74C3C" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ACTION BUTTON */}
      <TouchableOpacity
        style={[styles.actionButton, {
          backgroundColor: !selectedOption ? colors.border : isAnswered ? '#2ECC71' : colors.primary,
          marginBottom: 15
        }]}
        onPress={isAnswered ? () => navigation.goBack() : checkAnswer}
        disabled={!selectedOption}
      >
        <Text style={styles.actionButtonText}>
          {isAnswered ? 'Завершить (+50 XP)' : 'Проверить ответ'}
        </Text>
      </TouchableOpacity>
      
    </ScrollView>
  </SafeAreaView>
);
};

// 💡 Из стилей стираем фиксированный content: { flex: 1... }, чтобы прокрутка работала корректно
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  hintBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  hintText: { fontSize: 13, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 }, // Изменено на обычные отступы
  questionCard: { padding: 20, borderRadius: 24, borderWidth: 1, minHeight: 100, justifyContent: 'center' },
  questionText: { fontSize: 16, fontWeight: '600', textAlign: 'center', lineHeight: 24 },
  optionsContainer: { marginTop: 15 },
  optionButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  optionText: { fontSize: 15, fontWeight: '500', flex: 1, paddingRight: 10 },
  actionButton: { height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 15 },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default QuizScreen;
