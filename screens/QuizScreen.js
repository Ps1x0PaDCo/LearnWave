import React, { useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, ScrollView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import apiClient from '../services/api';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';

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
    const loadQuiz = async () => {
      try {
        // Принудительно сбрасываем стейт подсказки при загрузке новой темы, чтобы кнопка не блокировалась!
        setHintUsed(false); 
        
        const row = db.getFirstSync('SELECT quiz_question, content FROM topics WHERE id = ?', [topicId]);
        setLectureContent(row?.content || 'Текст лекции синхронизируется...');

        if (row?.quiz_question) {
          const parsed = JSON.parse(row.quiz_question);
          setQuizData(parsed);

          // Проверяем, не покупал ли юзер подсказку ранее ТОЛЬКО для этой конкретной темы
          const savedHintOptions = await AsyncStorage.getItem(`hint_options_${topicId}`);
          if (savedHintOptions) {
            setVisibleOptions(JSON.parse(savedHintOptions)); // Восстанавливаем 2 ответа из памяти
            setHintUsed(true); // Блокируем кнопку только здесь!
          } else {
            setVisibleOptions(parsed.options); // Если не покупали — рендерим чистые 4 ответа
          }
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

  // 💡 ФИЧА: Логика подсказки 50/50 (Убирает 2 неверных ответа за 50 монет)
  const useHint5050 = async () => {
    if (hintUsed || isAnswered) return;

    // 1. Защита: не даем тратить монеты впустую, если вариантов и так мало
    if (!quizData || quizData.options.length <= 2) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Подсказка недоступна 💡', 'В этом вопросе слишком мало вариантов ответа, подсказка не требуется.');
      return;
    }

    const hintPrice = 50;
    
    // 2. Проверяем баланс пользователя перед отправкой запроса
    if ((user?.balance || 0) < hintPrice) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Недостаточно монет 🪙', 'У вас не хватает монет для покупки подсказки.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 3. Отправляем запрос списания монет на бэкенд
      const res = await apiClient.post('/api/shop/buy', {
        item_type: 'quiz_hint',
        item_value: 'used_in_quiz',
        price: hintPrice
      });

      if (res.data.success) {
        // 4. Обновляем баланс юзера (проверяем все возможные варианты ответа от сервера)
        const currentBalance = res.data.balance || res.data.newBalance || ((user?.balance || 0) - hintPrice);
        setUser(prev => prev ? { ...prev, balance: currentBalance } : null);

        const correctAnswer = quizData.correct;
        const incorrectAnswers = quizData.options.filter(opt => opt !== correctAnswer);

        // Выбираем один случайный неверный ответ из оставшихся
        const randomIncorrect = incorrectAnswers[Math.floor(Math.random() * incorrectAnswers.length)];

        // Перемешиваем правильный и неверный ответы
        const newOptions = [correctAnswer, randomIncorrect].sort(() => Math.random() - 0.5);

        // Обновляем вёрстку на экране
        setVisibleOptions(newOptions);
        setHintUsed(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // 5. Записываем урезанные ответы в локальную память устройства намертво
        await AsyncStorage.setItem(`hint_options_${topicId}`, JSON.stringify(newOptions));
      }
    } catch (err) {
      console.log('❌ Ошибка активации подсказки 50/50:', err.message);
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
        
      {/* 📖 БЛОК 1: ТЕОРЕТИЧЕСКИЙ МАТЕРИАЛ (С полной поддержкой Markdown и формул) */}
      <View style={{
        backgroundColor: colors.surface,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
        marginTop: 10
      }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: colors.primary, letterSpacing: 1.5, marginBottom: 12 }}>
          📚 ТЕОРЕТИЧЕСКИЙ МАТЕРИАЛ
        </Text>

        {/* 💡 МАГИЯ ИВТ: Идеальный рендеринг лекции без синтаксических дубликатов */}
        <Markdown
          style={{
            body: { color: colors.textPrimary, fontSize: 15, lineHeight: 23 },
            heading3: { color: colors.primary, fontWeight: 'bold', marginTop: 12, marginBottom: 6, fontSize: 17 },
            strong: { fontWeight: 'bold', color: colors.textPrimary },
            bullet_list: { marginTop: 4, marginBottom: 8 },
            code_inline: {
              fontFamily: 'monospace',
              backgroundColor: isDarkMode ? '#1A202C' : '#EDF2F7',
              color: '#E74C3C',
              paddingHorizontal: 4,
              borderRadius: 4
            }
          }}
          rules={{
            // Передаем формулу в наш внешний адаптивный компонент MathFormula
            text: (node) => {
              const textContent = node.content || '';
              if (textContent.includes('[FORMULA]')) {
                const cleanFormula = textContent.replace(/\[FORMULA\]|\[\/FORMULA\]/g, '').trim();
                return (
                  <MathFormula 
                    key={node.key} 
                    cleanFormula={cleanFormula} 
                    isDarkMode={isDarkMode} 
                  />
                );
              }
              return <Text key={node.key}>{textContent}</Text>;
            }
          }}
        >
          {/* Передаем чистый текст лекции из PostgreSQL, заменяя переносы строк */}
          {lectureContent.replace(/\\n/g, '\n')}
        </Markdown>
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

// 🌟 АДАПТИВНЫЙ ИЗОЛИРОВАННЫЙ КОМПОНЕНТ ДЛЯ ФОРМУЛ (УБИРАЕТ ОШИБКУ RULES OF HOOKS И ДЕЛАЕТ ШРИФТ КРУПНЫМ)
const MathFormula = ({ cleanFormula, isDarkMode }) => {
  const [webViewHeight, setWebViewHeight] = useState(80);

  let latexString = cleanFormula;
  if (!latexString.startsWith('\\')) {
    latexString = latexString
      .replace(/frac/g, '\\frac')
      .replace(/det/g, '\\det')
      .replace(/cdot/g, '\\cdot')
      .replace(/begin{vmatrix}/g, '\\begin{vmatrix}')
      .replace(/end{vmatrix}/g, '\\end{vmatrix}')
      .replace(/alpha/g, '\\alpha')
      .replace(/beta/g, '\\beta');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script>
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$']],
            displayMath: [['$$', '$$']]
          },
          svg: { fontCache: 'global' }
        };
      </script>
      <script id="MathJax-script" async src="https://jsdelivr.net"></script>
      <style>
        * { box-sizing: border-box; }
        body { 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          margin: 0; 
          padding: 8px; 
          background-color: ${isDarkMode ? '#1A202C' : '#F7FAFC'};
          overflow: hidden;
        }
        #math { 
          color: #4A90E2; 
          text-align: center;
          /* Крупный академический размер формул */
          font-size: 24px; 
          width: 100%;
        }
        /* Стилизуем MathJax SVG, чтобы он масштабировался красиво */
        mjx-container[display="true"] {
          margin: 0 !important;
        }
      </style>
    </head>
    <body>
      <!-- Оборачиваем в двойные доллары для запуска полноценного блочного LaTeX режима -->
      <div id="math">$$\ ${latexString} \$$</div>
      <script>
        function sendHeight() {
          setTimeout(function() {
            var height = document.body.scrollHeight || document.documentElement.scrollHeight;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(height);
            }
          }, 150);
        }
        window.onload = function() {
          if (window.MathJax && MathJax.startup) {
            MathJax.startup.promise.then(function() {
              sendHeight();
            });
          } else {
            sendHeight();
          }
        };
      </script>
    </body>
    </html>
  `;

  return (
    <View style={{
      borderColor: '#4A90E2',
      borderWidth: 1.5,
      borderRadius: 16,
      marginVertical: 12,
      width: '100%',
      height: webViewHeight, 
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#1A202C' : '#F7FAFC'
    }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ backgroundColor: 'transparent' }}
        scrollEnabled={false}
        onMessage={(event) => {
          const height = parseInt(event.nativeEvent.data, 10);
          if (height && height > 0) {
            setWebViewHeight(height + 25); // Небольшой отступ для центрирования матрицы
          }
        }}
      />
    </View>
  );
};

export default QuizScreen;
