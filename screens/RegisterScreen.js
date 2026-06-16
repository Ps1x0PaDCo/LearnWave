import React, { useState, useContext, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar,
  ActivityIndicator, Keyboard
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';

const haptic = {
  impact: (style) => {
    if (Platform.OS !== 'web') {
      const Haptics = require('expo-haptics');
      Haptics.impactAsync(style);
    }
  },
  notification: (type) => {
    if (Platform.OS !== 'web') {
      const Haptics = require('expo-haptics');
      Haptics.notificationAsync(type);
    }
  },
};

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { isDarkMode, register } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const isEmailValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
  const isNameValid = useMemo(() => username.trim().length >= 2, [username]);
  const isPassValid = useMemo(() => password.length >= 6, [password]);
  const isMatch = useMemo(() => password === confirmPassword && confirmPassword !== '', [password, confirmPassword]);
  const isFormValid = isEmailValid && isNameValid && isPassValid && isMatch;

  const getBorderColor = (value, isValid) => {
    if (value.length === 0) return colors.border;
    return isValid ? '#2ECC71' : '#FF5E5E';
  };

  const handleGeneratePassword = () => {
    const charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let nextPassword = '';
    for (let i = 0; i < 14; i++) {
      nextPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(nextPassword);
    setConfirmPassword(nextPassword);
    setShowPassword(true);
    haptic.notification('success');
    Alert.alert('Пароль создан', 'Надёжный пароль вставлен в оба поля. Сохраните его перед регистрацией.');
  };

  const handleRegister = async () => {
    if (!isFormValid) {
      Alert.alert('Ошибка', 'Проверьте правильность заполнения полей.');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    haptic.impact('medium');

    try {
      const result = await register(email.trim(), username.trim(), password);

      if (result?.success) {
        haptic.notification('success');
      } else {
        haptic.notification('error');
        Alert.alert('Ошибка', result?.error || 'Такой email уже занят.');
      }
    } catch (err) {
      Alert.alert('Ошибка сети', 'Не удалось связаться с сервером. Проверьте подключение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="school" size={40} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Создать аккаунт</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Один профиль для курсов, достижений, магазина и личного прогресса.
          </Text>
          <View style={styles.benefitsRow}>
            <View style={[styles.benefitChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={[styles.benefitText, { color: colors.textMuted }]}>Курсы</Text>
            </View>
            <View style={[styles.benefitChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="trophy-outline" size={16} color="#F1C40F" />
              <Text style={[styles.benefitText, { color: colors.textMuted }]}>XP</Text>
            </View>
            <View style={[styles.benefitChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={[styles.benefitText, { color: colors.textMuted }]}>Профиль</Text>
            </View>
          </View>
        </View>

        <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: getBorderColor(email, isEmailValid) }]}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.icon} />
              <TextInput
                placeholder="example@mail.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textMuted }]}>ИМЯ</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: getBorderColor(username, isNameValid) }]}>
              <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.icon} />
              <TextInput
                placeholder="Ваше имя"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                style={[styles.input, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textMuted }]}>ПАРОЛЬ</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: getBorderColor(password, isPassValid) }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.icon} />
              <TextInput
                placeholder="Минимум 6 символов"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[styles.input, { color: colors.textPrimary }]}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textMuted }]}>ПОДТВЕРЖДЕНИЕ ПАРОЛЯ</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: getBorderColor(confirmPassword, isMatch) }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={isMatch ? '#2ECC71' : colors.primary} style={styles.icon} />
              <TextInput
                placeholder="Повторите пароль"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                style={[styles.input, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.genBtn} onPress={handleGeneratePassword}>
            <Ionicons name="key" size={18} color={colors.primary} />
            <Text style={[styles.genBtnText, { color: colors.primary }]}>Сгенерировать надёжный пароль</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: isFormValid ? colors.primary : colors.border }]}
            onPress={handleRegister}
            disabled={loading || !isFormValid}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.registerBtnText}>Зарегистрироваться</Text>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={{ color: colors.textMuted }}>Есть аккаунт? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Войти</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 34, paddingBottom: 36 },
  header: { alignItems: 'center', marginBottom: 22 },
  backButton: { alignSelf: 'flex-start', marginBottom: 10 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
  benefitsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  benefitChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
  benefitText: { fontSize: 12, fontWeight: '800' },
  form: { width: '100%', borderWidth: 1, borderRadius: 28, padding: 18 },
  inputWrapper: { marginBottom: 18 },
  label: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', height: 60, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 15 },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16 },
  genBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 25, paddingVertical: 5 },
  genBtnText: { fontWeight: 'bold', fontSize: 14 },
  registerBtn: { height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  registerBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
});

export default RegisterScreen;
