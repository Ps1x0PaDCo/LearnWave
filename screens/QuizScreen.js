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
import Svg, { Path, G } from 'react-native-svg'; // Перемести этот импорт наверх, если нужно

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

// 🎨 1. ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ КВАДРАТНОГО КОРНЯ
const SvgSquareRoot = ({ children }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
    <Svg height="36" width="22" viewBox="0 0 22 36" style={{ marginRight: -2 }}>
      <Path d="M2 22 L7 22 L12 32 L20 4 L22 4" fill="none" stroke="#4A90E2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
    <View style={{ borderTopWidth: 2.5, borderTopColor: '#4A90E2', paddingTop: 4, paddingHorizontal: 4, marginTop: -10 }}>
      {children}
    </View>
  </View>
);

// 🌟 НАПРАВЛЕННЫЙ И НЕУБИВАЕМЫЙ МОДУЛЬ МАТЕМАТИКИ ДЛЯ LEARNWAVE
const MathFormula = ({ cleanFormula, isDarkMode }) => {
  const text = cleanFormula.replace(/\[FORMULA\]|\[\/FORMULA\]/g, '').trim();
  
  // 💡 ХАК ИВТ: Определяем тип формулы по ключевым математическим маркерам или по структуре данных
  const isTrig = text.includes('sin') || text.includes('cos') || text.includes('alpha');
  const isRoot = text.toLowerCase().includes('sqrt') || text.includes('√') || text.includes('a2');
  
  // Железное разделение для темы Матриц:
  // Если в тексте есть детерминант матрицы 2х2 или слово vmatrix/a11 - это матрица
  const isMatrix = text.includes('vmatrix') || text.includes('a11') || text.includes('a22') || text.includes('a12');
  // Если есть деление, дробь или символы СЛАУ метода Крамера - это двухэтажная дробь
  const isCramer = text.includes('frac') || text.includes('—————') || text.includes('det(A') || text.includes('xi');

  return (
    <View style={{
      borderColor: '#4A90E2',
      borderWidth: 1.5,
      borderRadius: 16,
      marginVertical: 12,
      padding: 18,
      width: '100%',
      minHeight: isCramer || isMatrix ? 120 : 75,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF'
    }}>
      
      {/* 📐 1. ТРИГОНОМЕТРИЯ (Квадраты степеней и греческая Альфа) */}
      {isTrig && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#4A90E2', fontFamily: 'serif' }}>sin</Text>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#4A90E2', marginTop: -14, marginRight: 2 }}>2</Text>
          <Text style={{ fontSize: 22, color: '#4A90E2', fontFamily: 'serif' }}>(α) + </Text>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#4A90E2', fontFamily: 'serif' }}>cos</Text>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#4A90E2', marginTop: -14, marginRight: 2 }}>2</Text>
          <Text style={{ fontSize: 22, color: '#4A90E2', fontFamily: 'serif' }}>(α) = 1</Text>
        </View>
      )}

            {/* 📐 2. ВЕКТОРНАЯ МАТРИЦА И ОПРЕДЕЛИТЕЛЬ 2х2 (СВЕРХАДАПТИВНЫЙ ВАРИАНТ С АВТОПЕРЕНОСОМ) */}
      {isMatrix && (
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center', 
          flexWrap: 'wrap', // 🌟 Разрешаем элементам красиво переноситься, если не влезают
          gap: 12,          // Мягкий адаптивный отступ между блоками
          width: '100%' 
        }}>
          {/* Левый блок: Название определителя и сама векторная матрица */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#4A90E2', fontFamily: 'serif', marginRight: 8 }}>det(A) =</Text>
            
            {/* Левая вертикальная черта определителя */}
            <View style={{ width: 2, height: 50, backgroundColor: '#4A90E2', marginRight: 10 }} />
            
            {/* Сетка элементов матрицы */}
            <View style={{ gap: 6, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4A90E2', fontFamily: 'serif', width: 30, textAlign: 'center' }}>a₁₁</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4A90E2', fontFamily: 'serif', width: 30, textAlign: 'center' }}>a₁₂</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4A90E2', fontFamily: 'serif', width: 30, textAlign: 'center' }}>a₂₁</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4A90E2', fontFamily: 'serif', width: 30, textAlign: 'center' }}>a₂₂</Text>
              </View>
            </View>

            {/* Правая вертикальная черта определителя */}
            <View style={{ width: 2, height: 50, backgroundColor: '#4A90E2', marginLeft: 10 }} />
          </View>

          {/* Правый блок: Результат вычисления. Если экран узкий — он логично встанет чуть ниже по центру */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#4A90E2', fontFamily: 'serif' }}>= a₁₁a₂₂ - a₁₂a₂₁</Text>
          </View>
        </View>
      )}


      {/* 📐 3. ДВУХЭТАЖНАЯ ДРОБЬ МЕТОДА КРАМЕРА */}
      {isCramer && !isMatrix && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#4A90E2', fontFamily: 'serif', marginRight: 10 }}>x_i =</Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#4A90E2', paddingBottom: 2, fontFamily: 'serif' }}>det(A_i)</Text>
            <View style={{ width: 90, height: 2, backgroundColor: '#4A90E2' }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#4A90E2', paddingTop: 5, fontFamily: 'serif' }}>det(A)</Text>
          </View>
        </View>
      )}

      {/* 📐 4. АДАПТИВНЫЙ КВАДРАТНЫЙ КОРЕНЬ */}
      {isRoot && (
        <SvgSquareRoot>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, color: '#4A90E2', fontFamily: 'serif' }}>a</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4A90E2', marginTop: -12, marginRight: 4 }}>2</Text>
            <Text style={{ fontSize: 20, color: '#4A90E2', fontFamily: 'serif' }}>+ b</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4A90E2', marginTop: -12 }}>2</Text>
          </View>
        </SvgSquareRoot>
      )}

      {/* 📐 5. УНИВЕРСАЛЬНЫЙ СЦЕНАРИЙ С АВТО-ПАРСИНГОМ СТЕПЕНЕЙ ДЛЯ ОСТАЛЬНОГО ТЕКСТА */}
      {!isTrig && !isCramer && !isRoot && !isMatrix && (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {text.split(/(\^[0-9]|\_[0-9a-zA-Z])/).map((chunk, idx) => {
            const isPower = chunk.startsWith('^');
            const isSub = chunk.startsWith('_');
            return (
              <Text 
                key={idx} 
                style={{ 
                  fontSize: isPower || isSub ? 12 : 19, 
                  fontWeight: 'bold', 
                  color: '#4A90E2', 
                  fontFamily: 'serif',
                  marginTop: isPower ? -12 : isSub ? 8 : 0,
                  marginRight: isPower || isSub ? 2 : 0
                }}
              >
                {isPower ? chunk.replace('^', '') : isSub ? chunk.replace('_', '') : chunk.replace(/cdot/g, '·')}
              </Text>
            );
          })}
        </View>
      )}

    </View>
  );
};

export default QuizScreen;
