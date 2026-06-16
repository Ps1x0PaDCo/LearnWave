import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient from '../services/api';

const PasswordResetScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const { isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const validateEmail = (text) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());

  const handleSendEmail = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Ошибка', 'Введите корректный адрес почты.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      if (res?.data?.success === false) {
        Alert.alert('Ошибка', res.data.error || 'Не удалось создать код восстановления.');
        return;
      }

      setCurrentStep(2);
      if (res?.data?.devCode) {
        Alert.alert(
          'Код создан',
          `Почта сейчас недоступна, поэтому включён демонстрационный режим.\n\nКод: ${res.data.devCode}`
        );
      } else {
        Alert.alert('Код отправлен', `Код подтверждения отправлен на ${email.trim()}.`);
      }
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось отправить код. Проверьте сервер и настройки почты.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    if (pinCode.length !== 4) {
      Alert.alert('Ошибка', 'Введите 4-значный код из письма.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-reset-code', {
        email: email.trim().toLowerCase(),
        code: pinCode,
      });

      if (res?.data?.success) {
        setCurrentStep(3);
      } else {
        Alert.alert('Ошибка', res?.data?.error || 'Неверный код подтверждения.');
      }
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось проверить код.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не короче 6 символов.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: pinCode,
        newPassword,
      });

      if (res?.data?.success) {
        Alert.alert('Готово', 'Пароль успешно изменён. Теперь можно войти в аккаунт.', [
          { text: 'Войти', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Ошибка', res?.data?.error || 'Не удалось обновить пароль.');
      }
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось обновить пароль.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Почта', 'Код', 'Пароль'];
  const stepIcons = ['mail-outline', 'keypad-outline', 'lock-closed-outline'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={[styles.stepper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {stepLabels.map((label, i) => {
          const stepNumber = i + 1;
          const isDone = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;
          const isReached = currentStep >= stepNumber;

          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepCircle, {
                backgroundColor: isReached ? colors.primary : colors.background,
                borderColor: isReached ? colors.primary : colors.border,
              }]}>
                <Ionicons
                  name={isDone ? 'checkmark' : stepIcons[i]}
                  size={16}
                  color={isReached ? '#FFF' : colors.textMuted}
                />
              </View>
              <Text style={[styles.stepLabel, {
                color: isReached ? colors.primary : colors.textMuted,
                fontWeight: isActive ? '800' : '700',
              }]}>
                {label}
              </Text>
              {i < 2 && (
                <View style={[styles.stepLine, { backgroundColor: currentStep > stepNumber ? colors.primary : colors.border }]} />
              )}
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons
            name={currentStep === 3 ? 'lock-open-outline' : 'mail-unread-outline'}
            size={40}
            color={colors.primary}
          />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {currentStep === 1 ? 'Восстановление' : currentStep === 2 ? 'Введите код' : 'Новый пароль'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {currentStep === 1
            ? 'Введите почту, указанную при регистрации.'
            : currentStep === 2
              ? `Код отправлен на ${email}`
              : 'Придумайте новый пароль длиной не менее 6 символов.'}
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
              autoCorrect={false}
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
          <>
            <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                placeholder="Новый пароль"
                value={newPassword}
                onChangeText={setNewPassword}
                style={[styles.input, { color: colors.textPrimary }]}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(value => !value)}>
                <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={[styles.input, { color: colors.textPrimary }]}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(value => !value)}>
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: loading ? colors.border : colors.primary }]}
          onPress={currentStep === 1 ? handleSendEmail : currentStep === 2 ? handleVerifyPin : handleResetPassword}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Загрузка...' : 'Продолжить'}</Text>
        </TouchableOpacity>

        {currentStep > 1 && (
          <TouchableOpacity
            style={{ marginTop: 16, alignItems: 'center' }}
            onPress={() => setCurrentStep(s => s - 1)}
          >
            <Text style={[styles.backLink, { color: colors.textMuted }]}>Назад</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  backBtn: { marginBottom: 10 },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 26 },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  stepLabel: { fontSize: 12, marginLeft: 7 },
  stepLine: { flex: 1, height: 2, borderRadius: 1, marginHorizontal: 8 },
  content: { alignItems: 'center', paddingTop: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20, lineHeight: 20 },
  inputBox: { width: '100%', height: 56, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  input: { flex: 1, fontSize: 16, fontWeight: '600', height: '100%' },
  eyeButton: { width: 44, height: 44, marginRight: -8, justifyContent: 'center', alignItems: 'center' },
  mainBtn: { width: '100%', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2, marginTop: 8 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  backLink: { fontSize: 14, fontWeight: '600' },
});

export default PasswordResetScreen;
