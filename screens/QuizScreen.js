import React, { useState, useContext } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import apiClient from '../services/api'; // Импортируем сетевой клиент
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const QuizScreen = ({ route, navigation }) => {
  const { topic } = route.params;
  const { isDarkMode, nickname, completeTopic } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false); // Состояние сетевого запроса

  const handleCheckAnswer = async () => {
    if (!userAnswer.trim()) {
      Alert.alert("Внимание", "Введите ваш ответ");
      return;
    }

    const cleanUserAnswer = userAnswer.trim().toLowerCase();
    const cleanCorrectAnswer = topic.quiz_answer.toLowerCase();

    if (cleanUserAnswer === cleanCorrectAnswer) {
      setIsCorrect(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSyncing(true);

      try {
        // ЭСТАФЕТА: Отправляем topic.id на Node.js -> PostgreSQL
        await apiClient.post('/progress', { topic_id: topic.id });
        
        // Локальное сохранение (SQLite)
        completeTopic(nickname, topic.title);
        
        Alert.alert(
          "Отлично! +50 XP", 
          "Ответ верный. Прогресс синхронизирован с облаком.",
          [{ text: "К списку тем", onPress: () => navigation.pop(2) }]
        );
      } catch (error) {
        // Если сервер недоступен, работаем в оффлайн-режиме
        completeTopic(nickname, topic.title);
        Alert.alert(
          "Успех (Оффлайн)", 
          "Ответ верный! Сохранено локально, синхронизация будет позже.",
          [{ text: "Продолжить", onPress: () => navigation.pop(2) }]
        );
      } finally {
        setIsSyncing(false);
      }
    } else {
      setIsCorrect(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Неверно", "Попробуйте еще раз или перечитайте лекцию.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Проверка знаний</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.quizCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="help-circle" size={40} color={colors.primary} />
            </View>
            
            <Text style={[styles.questionLabel, { color: colors.textMuted }]}>ВОПРОС ПО ТЕМЕ:</Text>
            <Text style={[styles.questionText, { color: colors.textPrimary }]}>{topic.quiz_question}</Text>
            
            <View style={[styles.inputWrapper, { 
              borderColor: isCorrect === true ? '#2ECC71' : (isCorrect === false ? '#FF5E5E' : colors.border) 
            }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Ваш ответ..."
                placeholderTextColor={colors.textMuted}
                value={userAnswer}
                onChangeText={(text) => {
                  setUserAnswer(text);
                  setIsCorrect(null);
                }}
                autoCapitalize="none"
                editable={!isSyncing}
              />
            </View>

            <TouchableOpacity 
              style={[styles.checkBtn, { backgroundColor: isSyncing ? colors.textMuted : colors.primary }]} 
              onPress={handleCheckAnswer}
              disabled={isSyncing}
            >
              <Text style={styles.checkBtnText}>
                {isSyncing ? 'Синхронизация...' : 'Проверить ответ'}
              </Text>
              {!isSyncing && <Ionicons name="shield-checkmark" size={20} color="#FFF" />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.hintBtn} 
            onPress={() => navigation.goBack()}
            disabled={isSyncing}
          >
            <Text style={[styles.hintText, { color: colors.primary }]}>Вернуться к лекции за подсказкой</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  quizCard: { padding: 30, borderRadius: 32, borderWidth: 1, alignItems: 'center', elevation: 4, shadowOpacity: 0.05, shadowRadius: 15 },
  iconBadge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  questionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
  questionText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', lineHeight: 26, marginBottom: 30 },
  inputWrapper: { width: '100%', height: 60, borderRadius: 18, borderWidth: 2, paddingHorizontal: 15, marginBottom: 20, justifyContent: 'center' },
  input: { fontSize: 16, fontWeight: '500' },
  checkBtn: { width: '100%', height: 60, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  checkBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  hintBtn: { marginTop: 25, alignSelf: 'center' },
  hintText: { fontWeight: 'bold', fontSize: 14 }
});

export default QuizScreen;
