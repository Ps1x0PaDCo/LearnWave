import React, { useState, useContext, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar, ActivityIndicator, Keyboard 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { dbService } from '../services/database';
import { getThemeColors } from '../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- УМНАЯ ВАЛИДАЦИЯ ---
  const isEmailValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
  const isNameValid = useMemo(() => username.trim().length >= 3, [username]);
  const isPassValid = useMemo(() => password.length >= 6, [password]);
  const isMatch = useMemo(() => password === confirmPassword && confirmPassword !== '', [password, confirmPassword]);
  const isFormValid = isEmailValid && isNameValid && isPassValid && isMatch;

  // --- ПРОКАЧАННЫЙ ГЕНЕРАТОР ПАРОЛЯ ---
  const handleGeneratePassword = () => {
    const charset = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < 14; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    
    // Заполняем оба поля сразу
    setPassword(retVal);
    setConfirmPassword(retVal);
    setShowPassword(true); // Показываем сгенерированный пароль, чтобы пользователь его видел
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
        "🔑 Пароль сгенерирован", 
        "Надежный пароль создан и вставлен в оба поля. Запомните или запишите его!",
        [{ text: "Отлично" }]
    );
  };

  const { isDarkMode, login, register } = useContext(AuthContext); 
  const colors = getThemeColors(isDarkMode);
  const handleRegister = async () => {
    // 1. Проверка валидации (уже работает)
    console.log("--- ПРОВЕРКА ВАЛИДАЦИИ ---");
    console.log("Email:", email, "Валиден:", isEmailValid);
    console.log("Username:", username, "Валиден:", isNameValid);
    console.log("Password:", password, "Длина:", password.length, "Валиден:", isPassValid);
    console.log("Совпадение паролей:", isMatch);
    console.log("ИТОГО Форма валидна:", isFormValid);
    console.log("--------------------------");

    if (!isFormValid) return Alert.alert("Ошибка", "Проверьте правильность заполнения полей");

    Keyboard.dismiss();
    setLoading(true);
    
    if (Haptics.impactAsync) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // --- ВОТ ЭТОТ НОВЫЙ БЛОК ВЫЗОВА ---
      console.log("🚀 ЭСТАФЕТА: Передаю данные в AuthContext..."); 
      
      const result = await register(email, username, password);
      
      console.log("🏁 ЭСТАФЕТА: Получен ответ от контекста:", result);
      // ---------------------------------

      if (result && result.success) {
        if (Haptics.notificationAsync) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Успех!", `Добро пожаловать в LearnWave, ${username}!`);
      } else {
        if (Haptics.notificationAsync) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert("Ошибка", result?.error || "Этот email или имя уже заняты");
      }
    } catch (err) {
      console.log("❌ КРИТИЧЕСКАЯ ОШИБКА В handleRegister:", err.message);
      Alert.alert("Ошибка сети", "Не удалось связаться с сервером. Проверьте IP в api.js");
    } finally {
      setLoading(false);
    }
  };

  const getBorderColor = (value, isValid) => {
    if (value.length === 0) return colors.border;
    return isValid ? '#2ECC71' : '#FF5E5E';
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
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
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: getBorderColor(email, isEmailValid) }]}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.icon} />
              <TextInput placeholder="example@mail.com" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={[styles.input, { color: colors.textPrimary }]} />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textMuted }]}>НИКНЕЙМ</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: getBorderColor(username, isNameValid) }]}>
              <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.icon} />
              <TextInput placeholder="Твое имя" placeholderTextColor={colors.textMuted} value={username} onChangeText={setUsername} style={[styles.input, { color: colors.textPrimary }]} />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textMuted }]}>ПАРОЛЬ</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: getBorderColor(password, isPassValid) }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.icon} />
              <TextInput placeholder="Пароль" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} style={[styles.input, { color: colors.textPrimary }]} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textMuted }]}>ПОДТВЕРЖДЕНИЕ ПАРОЛЯ</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: getBorderColor(confirmPassword, isMatch) }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={isMatch ? '#2ECC71' : colors.primary} style={styles.icon} />
              <TextInput placeholder="Повторите пароль" placeholderTextColor={colors.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} style={[styles.input, { color: colors.textPrimary }]} />
            </View>
          </View>

          {/* КНОПКА ГЕНЕРАТОРА */}
          <TouchableOpacity style={styles.genBtn} onPress={handleGeneratePassword}>
            <Ionicons name="key" size={18} color={colors.primary} />
            <Text style={[styles.genBtnText, { color: colors.primary }]}>Сгенерировать надежный пароль</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.registerBtn, { backgroundColor: isFormValid ? colors.primary : colors.textMuted }]} onPress={handleRegister} disabled={loading || !isFormValid}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.registerBtnText}>Зарегистрироваться</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={{ color: colors.textMuted }}>Есть аккаунт? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={{ color: colors.primary, fontWeight: 'bold' }}>Войти</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 30, paddingTop: 40, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 30 },
  backButton: { alignSelf: 'flex-start', marginBottom: 10 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 28, fontWeight: 'bold' },
  form: { width: '100%' },
  inputWrapper: { marginBottom: 18 },
  label: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', height: 60, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 15 },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16 },
  genBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 25, paddingVertical: 5 },
  genBtnText: { fontWeight: 'bold', fontSize: 14 },
  registerBtn: { height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  registerBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 }
});

export default RegisterScreen;
