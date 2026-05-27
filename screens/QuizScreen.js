import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import apiClient from '../services/api'; // Импортируем для списания монет

const QuizScreen = ({ route, navigation }) => {
  const { topicId, topicTitle } = route.params || { topicId: 1, topicTitle: 'Тест' };
  const { isDarkMode, completeTopic, user, setUser } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [visibleOptions, setVisibleOptions] = useState([]); // Опции, которые видит юзер (для 50/50)
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintUsed, setHintUsed] = useState(false); // Использована ли подсказка в этом раунде

  useEffect(() => {
    const loadQuiz = () => {
      try {
        const row = db.getFirstSync('SELECT quiz_question FROM topics WHERE id = ?', [topicId]);
        if (row?.quiz_question) {
          const parsed = JSON.parse(row.quiz_question);
          setQuizData(parsed);
          setVisibleOptions(parsed.options); // Изначально видны все варианты
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
  }, [topicId]);

  const handleOptionPress = (option) => {
    if (isAnswered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(option);
  };

  // 💡 ФИЧА: Логика подсказки 50/50 (Убирает 2 неверных ответа за 30 монет)
  const useHint5050 = async () => {
    if (hintUsed || isAnswered) return;

    const hintPrice = 30; // Стоимость подсказки в монетах
    if ((user?.balance || 0) < hintPrice) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Недостаточно монет 🪙', 'У вас не хватает монет для покупки подсказки.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Списываем монеты через созданный нами ранее эндпоинт магазина
      const res = await apiClient.post('/api/shop/buy', {
        item_type: 'quiz_hint',
        item_value: 'used_in_quiz',
        price: hintPrice
      });

      if (res.data.success) {
        // Обновляем баланс монет на клиенте
        setUser(prev => prev ? { ...prev, balance: res.data.newBalance } : null);

        // Логика 50/50: оставляем правильный ответ + 1 случайный неверный
        const correctAnswer = quizData.correct;
        const incorrectAnswers = quizData.options.filter(opt => opt !== correctAnswer);

        // Выбираем один случайный неверный ответ
        const randomIncorrect = incorrectAnswers[Math.floor(Math.random() * incorrectAnswers.length)];

        // Перемешиваем их, чтобы правильный не всегда был первым
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
      completeTopic(user?.username, topicId, topicId);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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

        {/* КНОПКА ПОДСКАЗКИ (Отображается, только если вариантов больше 2 и ответ еще не дан) */}
        {quizData?.options.length > 2 && !isAnswered ? (
          <TouchableOpacity
            style={[
              styles.hintBtn,
              { backgroundColor: hintUsed ? colors.border : '#F1C40F20', borderColor: '#F1C40F50' }
            ]}
            disabled={hintUsed}
            onPress={useHint5050}
          >
            <Ionicons name="wand-outline" size={18} color={hintUsed ? colors.textMuted : '#F1C40F'} />
            <Text style={[styles.hintBtnText, { color: hintUsed ? colors.textMuted : '#F1C40F' }]}>50/50 (-30🪙)</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 45 }} />
        )}
      </View>

      <View style={styles.content}>
        <View style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.questionText, { color: colors.textPrimary }]}>
            {quizData?.question}
          </Text>
        </View>

        {/* ВАРИАНТЫ ОТВЕТОВ (Рендерим только visibleOptions) */}
        <View style={styles.optionsContainer}>
          {visibleOptions.map((option, idx) => {
            const isSelected = selectedOption === option;
            let buttonBg = colors.surface;
            let borderCol = colors.border;

            if (isAnswered) {
              if (option === quizData.correct) {
                buttonBg = '#2ECC7120';
                borderCol = '#2ECC71';
              } else if (isSelected && !isCorrect) {
                buttonBg = '#E74C3C20';
                borderCol = '#E74C3C';
              }
            } else if (isSelected) {
              buttonBg = colors.primary + '15';
              borderCol = colors.primary;
            }

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.optionCard, { backgroundColor: buttonBg, borderColor: borderCol }]}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>{option}</Text>
                {isAnswered && option === quizData.correct && (
                  <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          {!isAnswered ? (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: selectedOption ? colors.primary : colors.textMuted }
              ]}
              disabled={!selectedOption}
              onPress={checkAnswer}
            >
              <Text style={styles.actionBtnText}>Проверить ответ</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#2ECC71' }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.actionBtnText}>
                {isCorrect ? 'Завершить (+50 🪙)' : 'Вернуться к лекции'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  hintBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  hintBtnText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  content: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between', paddingBottom: 20 },
  questionCard: { padding: 30, borderRadius: 28, borderWidth: 1, marginTop: 10, elevation: 2 },
  questionText: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', lineHeight: 28 },
  optionsContainer: { marginTop: 20, flex: 1, justifyContent: 'center' },
  optionCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  optionText: { fontSize: 16, fontWeight: '600', flex: 1 },
  footer: { marginBottom: 10 },
  actionBtn: { height: 58, borderRadius: 20, justifyContent: 'center', alignItems: 'center', width: '100%' },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
}); export default QuizScreen;