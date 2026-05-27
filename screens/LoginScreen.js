import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, StyleSheet, TouchableOpacity, 
  Alert, ActivityIndicator, Modal, StatusBar, Keyboard 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { dbService } from '../services/database';
import { getThemeColors } from '../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { login, isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const handleSignIn = async () => {
    if (!email || !password) return Alert.alert("Ошибка", "Заполните все поля");
    
    Keyboard.dismiss();
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // ВЫЗЫВАЕМ СЕТЕВОЙ ЛОГИН (Node.js -> PostgreSQL)
      const res = await login(email, password);
      
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Переход в Home произойдет автоматически через AuthContext
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Ошибка входа", res.error);
      }
    } catch (e) {
      Alert.alert("Ошибка сети", "Не удалось связаться с сервером. Проверьте IP и Wi-Fi.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail || !newPass) return Alert.alert("Ошибка", "Заполните данные");
    setResetLoading(true);
    try {
      // Сброс пока оставляем локальным или через админку
      const res = await dbService.resetPassword(resetEmail, newPass);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Успех", "Пароль изменен локально!");
        setResetModal(false);
      }
    } catch (e) {
      Alert.alert("Ошибка", "Сервис временно недоступен");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>Вход</Text>
      
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
          secureTextEntry 
          value={password} 
          onChangeText={setPassword} 
          editable={!loading}
        />
      </View>

      <TouchableOpacity 
        onPress={() => !loading && setResetModal(true)} 
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
        <Text style={{ color: colors.textMuted }}>Ещё не с нами? </Text>
        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Присоединяйся к LearnWave</Text>
      </TouchableOpacity>

      {/* MODAL RESET */}
      <Modal visible={resetModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalT, { color: colors.textPrimary }]}>Сброс пароля</Text>
            <TextInput style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary }]} placeholder="Ваш Email" placeholderTextColor={colors.textMuted} value={resetEmail} onChangeText={setResetEmail} autoCapitalize="none" />
            <TextInput style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary }]} placeholder="Новый пароль" placeholderTextColor={colors.textMuted} secureTextEntry value={newPass} onChangeText={setNewPass} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 20 }}>
              <TouchableOpacity onPress={() => setResetModal(false)}><Text style={{ color: colors.textMuted }}>Отмена</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleReset}><Text style={{ color: colors.primary, fontWeight: 'bold' }}>Обновить</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 25 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
  inputW: { flexDirection: 'row', alignItems: 'center', height: 65, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 20, marginBottom: 12 },
  input: { flex: 1, marginLeft: 12, fontSize: 16 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 25, marginRight: 10 },
  btn: { height: 65, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  btnT: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  footerBtn: { marginTop: 25, alignSelf: 'center', flexDirection: 'row' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  modalBox: { padding: 30, borderRadius: 32 },
  modalT: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  mInput: { height: 55, borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 15, marginBottom: 15 },
});

export default LoginScreen;
