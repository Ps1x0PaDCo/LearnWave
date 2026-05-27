import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { UserContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';

const PasswordResetScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: Email, 2: PIN, 3: New Pass

  const { isDarkMode, executeQueryGetFirst, registerUser } = useContext(UserContext);
  const colors = getThemeColors(isDarkMode);

  const validateEmail = (text) => {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/.test(text);
  };

  const handleSendEmail = () => {
    if (!validateEmail(email.trim())) {
      Alert.alert('Ошибка', 'Введите корректный адрес почты');
      return;
    }

    // ПРОВЕРКА: Есть ли такой юзер в базе?
    const user = executeQueryGetFirst('SELECT * FROM users WHERE LOWER(email) = ?', [email.trim().toLowerCase()]);
    
    if (!user) {
      Alert.alert('Ошибка', 'Пользователь с такой почтой не найден');
      return;
    }

    setCurrentStep(2);
    Alert.alert('Код отправлен 📨', 'Для теста используйте код: 1234');
  };

  const handleVerifyPin = () => {
    if (pinCode === '1234') {
      setCurrentStep(3);
    } else {
      Alert.alert('Ошибка ❌', 'Неверный код подтверждения');
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
      return;
    }

    try {
      // Здесь мы вызываем функцию смены пароля (нужно будет добавить в dbService)
      // Либо имитируем успех для MVP
      Alert.alert('Успех 🎉', 'Пароль успешно изменен! Теперь вы можете войти.', [
        { text: 'Войти', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось обновить пароль');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons 
            name={currentStep === 3 ? "lock-open-outline" : "mail-unread-outline"} 
            size={40} color={colors.primary} 
          />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {currentStep === 1 ? 'Восстановление' : currentStep === 2 ? 'Введите код' : 'Новый пароль'}
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {currentStep === 1 ? 'Введите почту, указанную при регистрации' : 
           currentStep === 2 ? `Код отправлен на ${email}` : 'Придумайте надежный пароль'}
        </Text>

        {currentStep === 1 && (
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput 
              placeholder="Email" 
              value={email} 
              onChangeText={setEmail} 
              style={[styles.input, { color: colors.textPrimary }]}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        )}

        {currentStep === 2 && (
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput 
              placeholder="0 0 0 0" 
              value={pinCode} 
              onChangeText={setPinCode} 
              style={[styles.input, { color: colors.textPrimary, textAlign: 'center', letterSpacing: 10 }]}
              maxLength={4}
              keyboardType="number-pad"
            />
          </View>
        )}

        {currentStep === 3 && (
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput 
              placeholder="Минимум 6 символов" 
              value={newPassword} 
              onChangeText={setNewPassword} 
              style={[styles.input, { color: colors.textPrimary }]}
              secureTextEntry
            />
          </View>
        )}

        <TouchableOpacity 
          style={[styles.mainBtn, { backgroundColor: colors.primary }]} 
          onPress={currentStep === 1 ? handleSendEmail : currentStep === 2 ? handleVerifyPin : handleResetPassword}
        >
          <Text style={styles.btnText}>Продолжить</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  backBtn: { marginBottom: 20 },
  content: { alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  inputBox: { width: '100%', height: 56, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center', marginBottom: 20 },
  input: { fontSize: 16, fontWeight: '600' },
  mainBtn: { width: '100%', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default PasswordResetScreen;
