import React, { useState, useEffect, useContext, useRef } from 'react';
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

import apiClient from '../services/api';
import Markdown from 'react-native-markdown-display';

// ─── Haptics: безопасная обёртка (не падает на вебе) ─────────────────────────
const haptic = {
  impact: (style) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.impactAsync(style); } },
  notification: (type) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.notificationAsync(type); } },
};

import Svg, { Path, G } from 'react-native-svg'; // Перемести этот импорт наверх, если нужно

const QuizScreen = ({ route, navigation }) => {
  const { topicId, topicTitle, topicKey } = route.params || { topicId: 1, topicTitle: 'Тест', topicKey: 'topic_1' };
  const { isDarkMode, completeTopic, user, setUser, completedCourses } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [visibleOptions, setVisibleOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [completedBeforeAnswer, setCompletedBeforeAnswer] = useState(null);
  const scrollRef = useRef(null);
  const finalTopicKey = route.params?.topicKey || `topic_${topicId}`;
  const subjectKey = route.params?.subjectKey || '';
  const alreadyCompleted = completedCourses?.includes(finalTopicKey) ||
    (subjectKey ? completedCourses?.includes(`${subjectKey}_${topicId}`) : completedCourses?.includes(`topic_${topicId}`));
  
  // 🌟 ДОБАВИЛИ: Стейт для хранения текста лекции
  const [lectureContent, setLectureContent] = useState('');

  useEffect(() => {
    const createDefaultQuiz = () => ({
      question: `Вы изучили тему "${topicTitle}". Подтвердите, что материал усвоен!`,
      options: ["Материал усвоен полностью!", "Нужно еще повторить"],
      correct: "Материал усвоен полностью!",
      explanation: "Если материал пока кажется неясным, лучше вернуться к теории и ещё раз разобрать пример."
    });

    const normalizeQuiz = (rawQuiz) => {
      if (!rawQuiz) return createDefaultQuiz();

      const parsed = typeof rawQuiz === 'string' ? JSON.parse(rawQuiz) : rawQuiz;
      const fallback = createDefaultQuiz();
      const options = Array.isArray(parsed.options) && parsed.options.length > 0
        ? parsed.options
        : fallback.options;

      return {
        ...parsed,
        question: parsed.question || fallback.question,
        options,
        correct: parsed.correct || options[0],
        explanation: parsed.explanation || fallback.explanation,
      };
    };

    const loadTopicRow = async () => {
      const subjectKey = route.params?.subjectKey || '';
      const res = await apiClient.get(`/topics?subject_key=${subjectKey}`).catch(() => null);
      const topics = Array.isArray(res?.data?.topics) ? res.data.topics : [];
      const byId = topics.find(item => String(item.id) === String(topicId) || String(item.server_id) === String(topicId));
      if (byId) return byId;

      const fallbackRes = await apiClient.get('/topics').catch(() => null);
      const fallbackTopics = Array.isArray(fallbackRes?.data?.topics) ? fallbackRes.data.topics : [];
      const fallbackById = fallbackTopics.find(item => String(item.id) === String(topicId) || String(item.server_id) === String(topicId));
      if (fallbackById) return fallbackById;

      return db.getFirstSync('SELECT quiz_question, content FROM topics WHERE id = ? OR server_id = ?', [topicId, topicId]);
    };

    const loadQuiz = async () => {
      try {
        // Принудительно сбрасываем стейт подсказки при загрузке новой темы, чтобы кнопка не блокировалась!
        setHintUsed(false);
        setSelectedOption(null);
        setIsAnswered(false);
        setIsCorrect(false);
        setNeedsReview(false);
        setCompletedBeforeAnswer(null);
        setLoading(true);

        const row = await loadTopicRow();
        setLectureContent(row?.content || 'Текст лекции синхронизируется...');

        if (row?.quiz_question) {
          const parsed = normalizeQuiz(row.quiz_question);
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
          const defaultQuiz = createDefaultQuiz();
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
    haptic.impact('medium');
    setSelectedOption(option);
  };

  // 💡 ФИЧА: Логика подсказки 50/50 (Убирает 2 неверных ответа за 50 монет)
  const useHint5050 = async () => {
    if (hintUsed || isAnswered || alreadyCompleted) return;

    // 1. Защита: не даем тратить монеты впустую, если вариантов и так мало
    if (!quizData || quizData.options.length <= 2) {
      haptic.notification('medium');
      Alert.alert('Подсказка недоступна 💡', 'В этом вопросе слишком мало вариантов ответа, подсказка не требуется.');
      return;
    }

    const hintPrice = 50;
    
    haptic.impact('medium');

    const applyHintOptions = async () => {
      const correctAnswer = quizData.correct;
      const incorrectAnswers = quizData.options.filter(opt => opt !== correctAnswer);
      const randomIncorrect = incorrectAnswers[Math.floor(Math.random() * incorrectAnswers.length)];
      const newOptions = [correctAnswer, randomIncorrect].sort(() => Math.random() - 0.5);
      setVisibleOptions(newOptions);
      setHintUsed(true);
      haptic.notification('medium');
      await AsyncStorage.setItem(`hint_options_${topicId}`, JSON.stringify(newOptions));
    };

    try {
      const inventoryUse = await apiClient.post('/shop/use-item', {
        item_type: 'quiz_hint',
        item_value: 'hint_5050',
      }).catch(() => null);

      if (inventoryUse?.data?.success) {
        await applyHintOptions();
        return;
      }

      if ((user?.balance || 0) < hintPrice) {
        haptic.notification('medium');
        Alert.alert('Недостаточно монет 🪙', 'У вас не хватает монет для покупки подсказки.');
        return;
      }

      // 3. Отправляем запрос списания монет на бэкенд
      const res = await apiClient.post('/shop/buy', {
        item_type: 'quiz_hint',
        item_value: 'single_hint',
        price: hintPrice
      });

      if (res.data.success) {
        // 4. Обновляем баланс юзера (проверяем все возможные варианты ответа от сервера)
        const currentBalance = res.data.balance || res.data.newBalance || ((user?.balance || 0) - hintPrice);
        setUser(prev => prev ? { ...prev, balance: currentBalance } : null);
        await apiClient.post('/shop/use-item', {
          item_type: 'quiz_hint',
          item_value: 'hint_5050',
        }).catch(() => null);
        await applyHintOptions();
      }
    } catch (err) {
      console.log('❌ Ошибка активации подсказки 50/50:', err.message);
      Alert.alert('Ошибка', 'Не удалось активировать подсказку.');
    }
  };


  const checkAnswer = () => {
    if (!selectedOption || isAnswered) return;

    const correct = selectedOption === quizData.correct;
    const wasCompletedBeforeAnswer = alreadyCompleted;
    setIsCorrect(correct);
    setIsAnswered(true);
    setNeedsReview(!correct);
    setCompletedBeforeAnswer(wasCompletedBeforeAnswer);

    if (correct) {
      haptic.notification('medium');
      const accountKey = user?.email || String(user?.id || '') || user?.username;
      if (!wasCompletedBeforeAnswer) {
        completeTopic(accountKey, finalTopicKey, topicId);
      }
    } else {
      haptic.notification('medium');
    }
  };

  const repeatMaterial = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(false);
    setNeedsReview(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const finishCorrectAnswer = () => {
    navigation.goBack();
  };

  const getFeedbackText = () => {
    if (!quizData) return '';
    if (isCorrect) {
      if (completedBeforeAnswer === true) return 'Ответ верный. Эта тема уже была пройдена ранее, поэтому награда повторно не начисляется.';
      return quizData.successExplanation || 'Ответ верный: тема засчитана. Начислены опыт и монеты.';
    }
    const customExplanation = quizData.explanations?.[selectedOption] || quizData.explanation;
    return customExplanation || 'Ответ неверный. Вернитесь к теории и примеру выше, затем попробуйте ещё раз.';
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderLectureContent = () => {
    const normalizedLecture = lectureContent
      .replace(/\\n/g, '\n')
      .replace(/^(#{1,6})(\S)/gm, '$1 $2');
    const parts = normalizedLecture.split(/(\[FORMULA\][\s\S]*?\[\/FORMULA\])/g);

    return parts
      .filter(part => part && part.trim().length > 0)
      .map((part, index) => {
        const formulaMatch = part.match(/\[FORMULA\]([\s\S]*?)\[\/FORMULA\]/);
        if (formulaMatch) {
          return (
            <MathFormula
              key={`formula-${index}`}
              cleanFormula={formulaMatch[1].trim()}
              isDarkMode={isDarkMode}
            />
          );
        }

        return (
          <Markdown
            key={`markdown-${index}`}
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
          >
            {part}
          </Markdown>
        );
      });
  };

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

        {!alreadyCompleted && (
          <TouchableOpacity
            style={[styles.hintBtn, {
              backgroundColor: hintUsed ? colors.border : colors.primary + '15',
              opacity: hintUsed || isAnswered ? 0.6 : 1
            }]}
            onPress={useHint5050}
            disabled={hintUsed || isAnswered}
          >
            <Text style={[styles.hintText, { color: hintUsed ? colors.textMuted : colors.primary }]}>50/50 🪙50</Text>
          </TouchableOpacity>
        )}
      </View>

          {/* 🌟 ИСПРАВЛЕНО: Обернули в ScrollView, чтобы лекция и квиз плавно прокручивались */}
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.topicHero, { backgroundColor: colors.primary }]}>
        <View style={styles.topicHeroIcon}>
          <Ionicons name="school-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.topicHeroText}>
          <Text style={styles.topicHeroLabel}>ТЕМА УРОКА</Text>
          <Text style={styles.topicHeroTitle} numberOfLines={2}>{topicTitle}</Text>
        </View>
      </View>

      <View style={[styles.lessonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="book-outline" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Теория и формула</Text>
        </View>

        {needsReview && !isAnswered && (
          <View style={[styles.reviewBanner, { backgroundColor: '#F39C1215', borderColor: '#F39C1240' }]}>
            <Ionicons name="refresh-circle-outline" size={20} color="#F39C12" />
            <Text style={styles.reviewBannerText}>
              Повторите материал и пример, затем попробуйте ответить ещё раз.
            </Text>
          </View>
        )}

        {renderLectureContent()}
      </View>

      <View style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 0 }]}>
        <View style={styles.quizHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.quizLabel, { color: colors.textMuted }]}>Контрольный вопрос</Text>
        </View>
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
            if (isCorrect && option === quizData.correct) {
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
              {isAnswered && isCorrect && option === quizData.correct && (
                <Ionicons name="checkmark-circle" size={22} color="#2ECC71" />
              )}
              {isAnswered && isSelected && !isCorrect && (
                <Ionicons name="close-circle" size={22} color="#E74C3C" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {isAnswered && (
        <View style={[
          styles.feedbackCard,
          {
            backgroundColor: isCorrect ? '#2ECC7115' : '#E74C3C15',
            borderColor: isCorrect ? '#2ECC7140' : '#E74C3C40',
          }
        ]}>
          <View style={styles.feedbackHeader}>
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'alert-circle'}
              size={22}
              color={isCorrect ? '#2ECC71' : '#E74C3C'}
            />
            <Text style={[styles.feedbackTitle, { color: isCorrect ? '#2ECC71' : '#E74C3C' }]}>
              {isCorrect ? 'Ответ верный' : 'Ответ неверный'}
            </Text>
          </View>
          <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>
            {getFeedbackText()}
          </Text>
        </View>
      )}

      {/* ACTION BUTTON */}
      <TouchableOpacity
        style={[styles.actionButton, {
          backgroundColor: !selectedOption ? colors.border : isAnswered ? (isCorrect ? '#2ECC71' : '#E74C3C') : colors.primary,
          marginBottom: 15
        }]}
        onPress={isAnswered ? (isCorrect ? finishCorrectAnswer : repeatMaterial) : checkAnswer}
        disabled={!selectedOption}
      >
        <Text style={styles.actionButtonText}>
          {isAnswered ? (isCorrect ? (completedBeforeAnswer === true ? 'Пройдено' : 'Завершить (+50 XP/монет)') : 'Повторить материал') : 'Проверить ответ'}
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
  content: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 },
  topicHero: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, marginBottom: 16 },
  topicHeroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  topicHeroText: { flex: 1 },
  topicHeroLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  topicHeroTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', lineHeight: 25 },
  lessonCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 18 },
  reviewBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 14, gap: 8 },
  reviewBannerText: { flex: 1, color: '#B26B00', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  questionCard: { padding: 20, borderRadius: 24, borderWidth: 1, minHeight: 112, justifyContent: 'center' },
  quizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quizLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  questionText: { fontSize: 17, fontWeight: '700', textAlign: 'center', lineHeight: 25 },
  optionsContainer: { marginTop: 15 },
  optionButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  optionText: { fontSize: 15, fontWeight: '500', flex: 1, paddingRight: 10 },
  feedbackCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 4, marginBottom: 2 },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  feedbackTitle: { fontSize: 15, fontWeight: '900' },
  feedbackText: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
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

const toMathSymbols = (value) => value
  .replace(/->/g, '→')
  .replace(/\*/g, '·')
  .replace(/alpha/g, 'α')
  .replace(/sqrt/g, '√')
  .replace(/lim_/g, 'lim ')
  .replace(/infty/g, '∞');

const FormulaText = ({ text }) => {
  const normalized = toMathSymbols(text);
  const chunks = normalized.split(/(\^[0-9a-zA-Z+-]+|_[0-9a-zA-Z+-]+)/);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      {chunks.map((chunk, idx) => {
        const isPower = chunk.startsWith('^');
        const isSub = chunk.startsWith('_');
        const clean = isPower || isSub ? chunk.slice(1) : chunk;
        return (
          <Text
            key={`${chunk}-${idx}`}
            style={{
              fontSize: isPower || isSub ? 12 : 20,
              fontWeight: 'bold',
              color: '#4A90E2',
              fontFamily: 'serif',
              marginTop: isPower ? -13 : isSub ? 9 : 0,
              marginRight: isPower || isSub ? 2 : 0,
            }}
          >
            {clean}
          </Text>
        );
      })}
    </View>
  );
};

// 🌟 НАПРАВЛЕННЫЙ И НЕУБИВАЕМЫЙ МОДУЛЬ МАТЕМАТИКИ ДЛЯ LEARNWAVE
const MathText = ({ children, size = 22, style }) => (
  <Text style={[{ fontSize: size, fontWeight: 'bold', color: '#4A90E2', fontFamily: 'serif' }, style]}>
    {children}
  </Text>
);

const Sup = ({ children }) => (
  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4A90E2', marginTop: -10, marginLeft: 1 }}>
    {children}
  </Text>
);

const Sub = ({ children }) => (
  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4A90E2', marginTop: 12, marginLeft: 1 }}>
    {children}
  </Text>
);

const PowerTerm = ({ base, power, suffix = '' }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
    <MathText>{base}</MathText>
    <Sup>{power}</Sup>
    {suffix ? <MathText>{suffix}</MathText> : null}
  </View>
);

const Fraction = ({ numerator, denominator, width = 92 }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ minWidth: width, alignItems: 'center', paddingHorizontal: 6 }}>
      {numerator}
    </View>
    <View style={{ width, height: 2, borderRadius: 1, backgroundColor: '#4A90E2', marginVertical: 4 }} />
    <View style={{ minWidth: width, alignItems: 'center', paddingHorizontal: 6 }}>
      {denominator}
    </View>
  </View>
);

const formulaKey = (value) => value.replace(/\s+/g, '').toLowerCase();

const renderFormulaTemplate = (text) => {
  switch (formulaKey(text)) {
    case "f'(x)=lim_{h->0}(f(x+h)-f(x))/h":
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <MathText style={{ marginRight: 8 }}>f'(x) =</MathText>
          <View style={{ alignItems: 'center', marginRight: 10 }}>
            <MathText size={21}>lim</MathText>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#4A90E2', fontFamily: 'serif', marginTop: -3 }}>h→0</Text>
          </View>
          <Fraction
            width={138}
            numerator={<MathText size={17}>f(x + h) - f(x)</MathText>}
            denominator={<MathText size={17}>h</MathText>}
          />
        </View>
      );

    case 'd=b^2-4ac':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <MathText>D = </MathText>
          <PowerTerm base="b" power="2" />
          <MathText> - 4ac</MathText>
        </View>
      );

    case 'sin^2(alpha)+cos^2(alpha)=1':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <PowerTerm base="sin" power="2" suffix="(α)" />
          <MathText> + </MathText>
          <PowerTerm base="cos" power="2" suffix="(α)" />
          <MathText> = 1</MathText>
        </View>
      );

    case 'i=u/r':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <MathText style={{ marginRight: 10 }}>I =</MathText>
          <Fraction
            width={42}
            numerator={<MathText size={20}>U</MathText>}
            denominator={<MathText size={20}>R</MathText>}
          />
        </View>
      );

    case 'f=m*a':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <MathText>F = m · a</MathText>
        </View>
      );

    case 'e_k=m*v^2/2':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
            <MathText>E</MathText>
            <Sub>k</Sub>
            <MathText> =</MathText>
          </View>
          <Fraction
            width={72}
            numerator={
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <MathText size={20}>m · v</MathText>
                <Sup>2</Sup>
              </View>
            }
            denominator={<MathText size={20}>2</MathText>}
          />
        </View>
      );

    default:
      return <FormulaText text={text} />;
  }
};

const MathFormula = ({ cleanFormula, isDarkMode }) => {
  const text = cleanFormula.replace(/\[FORMULA\]|\[\/FORMULA\]/g, '').trim();

  return (
    <View style={{
      borderColor: '#4A90E2',
      borderWidth: 1.5,
      borderRadius: 16,
      marginVertical: 12,
      padding: 18,
      width: '100%',
      minHeight: 82,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF'
    }}>
      {renderFormulaTemplate(text)}
    </View>
  );
};
export default QuizScreen;


