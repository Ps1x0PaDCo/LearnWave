import React, { useState, useContext } from 'react';
import {
  View, Platform, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar, Keyboard
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';

const haptic = {
  impact: (style) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.impactAsync(style); } },
  notification: (type) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.notificationAsync(type); } },
};

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните email и пароль.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    haptic.impact('medium');

    try {
      const res = await login(email, password);
      if (res.success) {
        haptic.notification('success');
      } else {
        haptic.notification('error');
        Alert.alert('Ошибка входа', res.error || 'Не удалось войти в аккаунт.');
      }
    } catch (e) {
      Alert.alert('Ошибка сети', 'Не удалось связаться с сервером. Проверьте IP и подключение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.brand}>
        <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="school" size={34} color="#FFF" />
        </View>
        <Text style={[styles.brandName, { color: colors.textPrimary }]}>LearnWave</Text>
        <Text style={[styles.brandSub, { color: colors.textMuted }]}>
          Учебный кабинет для коротких курсов, практики и прогресса.
        </Text>
      </View>

      <View style={[styles.loginCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Вход в аккаунт</Text>

        <View style={[styles.inputW, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
        </View>

        <View style={[styles.inputW, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Пароль"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowPassword(value => !value)} disabled={loading}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => !loading && navigation.navigate('PasswordReset')}
          style={styles.forgotBtn}
          disabled={loading}
        >
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Забыли пароль?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.8 : 1 }]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnT}>Войти в аккаунт</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => !loading && navigation.navigate('Register')}
          style={styles.footerBtn}
        >
          <Text style={{ color: colors.textMuted }}>Ещё нет аккаунта? </Text>
          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Создать профиль</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 22 },
  brandIcon: { width: 76, height: 76, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  brandName: { fontSize: 30, fontWeight: '900' },
  brandSub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8, paddingHorizontal: 10 },
  loginCard: { borderRadius: 28, borderWidth: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 22, textAlign: 'center' },
  inputW: { flexDirection: 'row', alignItems: 'center', height: 65, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 20, marginBottom: 12 },
  input: { flex: 1, marginLeft: 12, fontSize: 16 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 25, marginRight: 10 },
  btn: { height: 65, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  btnT: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  footerBtn: { marginTop: 22, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});

export default LoginScreen;
