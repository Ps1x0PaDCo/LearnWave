import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Dimensions, StatusBar, Platform, ActivityIndicator, Modal, TextInput
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { dbService } from '../services/database';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const AVATAR_DATA = {
  '🦉': { label: 'Мудрость', desc: 'Символ глубоких знаний.' },
  '🦊': { label: 'Остроумие', desc: 'Признак хитрости и гибкого ума.' },
  '🐱': { label: 'Независимость', desc: 'Любопытство в познании мира.' },
  '🐼': { label: 'Выдержка', desc: 'Спокойствие в решении задач.' },
  '🦁': { label: 'Лидерство', desc: 'Сила воли и стремление к цели.' }
};

const ProfileScreen = ({ navigation }) => {
  const {
    nickname, isDarkMode, toggleTheme, logout, updateUserName,
    getCompletedTopics, getAchievements, user,
    deleteUserAccount, calculateLevel, activeBorder,
    setActiveBorder, buyInterfaceBorder,
  } = useContext(AuthContext);

  const { level, xpInCurrentLevel, progress, xpRemaining, xpPerLevel } = calculateLevel(user?.balance || 0);

  const colors = getThemeColors(isDarkMode);
  const [selectedAvatar, setSelectedAvatar] = useState('🦉');
  const [stats, setStats] = useState({ completed: [], awards: [] });
  const [loading, setLoading] = useState(false);
  // Состояния для модалки безопасного удаления аккаунта
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const loadSavedBorder = async () => {
      if (nickname) {
        const savedBorder = await AsyncStorage.getItem(`border_${nickname}`);
        if (savedBorder) setActiveBorder(savedBorder);
      }
    };
    loadSavedBorder();
  }, [nickname]);

  // Состояния для модалки редактирования
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [tempNickname, setTempNickname] = useState('');


  useEffect(() => {
    const refreshData = async () => {
      if (nickname) {
        const comp = getCompletedTopics(nickname) || [];
        const achs = getAchievements(nickname) || [];
        const saved = await AsyncStorage.getItem(`avatar_${nickname}`);
        setStats({ completed: comp, awards: achs });
        if (saved) setSelectedAvatar(saved);
        setTempNickname(nickname);
      }
    };
    refreshData();
  }, [nickname]);

  const saveNewNickname = async () => {
    const trimmedName = tempNickname.trim();
    if (trimmedName.length >= 3) {
      if (trimmedName === nickname) {
        setEditModalVisible(false);
        return;
      }
      setLoading(true);
      try {
        const result = await dbService.updateNickname(nickname, trimmedName);
        if (result.success) {
          updateUserName(trimmedName);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setEditModalVisible(false);
        } else {
          Alert.alert("Ошибка", result.error);
        }
      } catch (e) {
        Alert.alert("Ошибка", "Не удалось обновить имя");
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert("Ошибка", "Никнейм должен быть не короче 3 символов");
    }
  };
  // Функция-триггер для безопасного каскадного удаления аккаунта
  const handleConfirmDelete = async () => {
    const passwordToSend = confirmPassword.trim();
    if (!passwordToSend) {
      Alert.alert("Ошибка", "Пожалуйста, введите ваш текущий пароль.");
      return;
    }

    setLoading(true);
    try {
      // Вызываем наш безопасный метод из AuthContext
      const result = await deleteUserAccount(passwordToSend);

      if (result && result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setDeleteModalVisible(false);
        setConfirmPassword('');
        Alert.alert("Успех", "Ваш аккаунт и все связанные данные были безвозвратно удалены.");
      } else {
        Alert.alert("Ошибка доступа", result?.error || "Неверный пароль.");
      }
    } catch (e) {
      Alert.alert("Ошибка сети", "Не удалось связаться с сервером базы данных PostgreSQL.");
    } finally {
      setLoading(false);
    }
  };


  const changeAvatar = async (emoji) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAvatar(emoji);
    await AsyncStorage.setItem(`avatar_${nickname}`, emoji);
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <View style={[styles.nav, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Профиль</Text>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.mainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>

          {/* 🖼️ Аватар с динамической рамкой из Wave-Shop */}
          <View style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: (!activeBorder || activeBorder === 'none') ? 0 : 4,
            // 💡 Синхронизировали рамки с товарами из Wave-Shop:
            borderColor: activeBorder === 'bronze' ? '#CD7F32' : activeBorder === 'gold' ? '#FFD700' : '#FF007F',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
            backgroundColor: colors.background
          }}>
            <Text style={[styles.bigEmoji, { marginBottom: 0, fontSize: 65, textAlign: 'center' }]}>{selectedAvatar}</Text>
          </View>
          {/* 🖼️ КОНЕЦ Аватар с динамической рамкой кастомизации интерфейса */}

          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{nickname}</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.editBtn}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* === 📧 ОТОБРАЖЕНИЕ НАСТОЯЩЕЙ ПОЧТЫ ИЗ POSTGRESQL === */}
          {user?.email && (
            <View style={[styles.emailBadge, { backgroundColor: colors.background + '80', borderColor: colors.border, marginVertical: 8 }]}>
              <Ionicons name="mail-outline" size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.emailText, { color: colors.textMuted }]}>
                {user.email}
              </Text>
            </View>
          )}



          {/* === 📊 ДИНАМИЧЕСКИЙ ПРОГРЕСС-БАР УРОВНЯ ДЛЯ ДИПЛОМА === */}
          <View style={{ width: '100%', marginTop: 15, marginBottom: 5, paddingHorizontal: 4 }}>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              {/* Бейдж текущего уровня */}
              <View style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '30' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 }}>
                  {level} УРОВЕНЬ
                </Text>
              </View>
              {/* Текстовый счетчик опыта */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                {xpInCurrentLevel} / {xpPerLevel} XP
              </Text>
            </View>

            {/* Трек (фон) полосы прогресса */}
            <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden', marginBottom: 6 }}>
              {/* Заполненная часть полосы (ширина вычисляется динамически от 0% до 100%) */}
              <View style={{ height: '100%', backgroundColor: colors.primary, borderRadius: 5, width: `${progress * 100}%` }} />
            </View>

            {/* Подсказка об остатке */}
            <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'right', fontStyle: 'italic' }}>
              Осталось {xpRemaining} XP до следующего уровня
            </Text>
          </View>
          {/* === КОНЕЦ ВСТАВКИ ПРОГРЕСС-БАРА === */}

          <Text style={[styles.avatarDesc, { color: colors.textMuted }]}>{AVATAR_DATA[selectedAvatar]?.desc}</Text>

          <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
            <View style={styles.statMini}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{stats.completed.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Лекций</Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
            <View style={styles.statMini}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{stats.awards.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Наград</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.achBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Achievements')}
        >
          <Text style={[styles.achBtnText, { color: colors.textPrimary }]}>Посмотреть все достижения</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Выбор талисмана</Text>
        <View style={styles.avatarGrid}>
          {Object.keys(AVATAR_DATA).map(emoji => (
            <TouchableOpacity
              key={emoji}
              onPress={() => changeAvatar(emoji)}
              style={[styles.avatarBtn, {
                backgroundColor: selectedAvatar === emoji ? colors.primary + '15' : colors.surface,
                borderColor: selectedAvatar === emoji ? colors.primary : colors.border
              }]}
            >
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* КНОПКИ УПРАВЛЕНИЯ СЕССИЕЙ И АККАУНТОМ */}
        <View style={{ gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={logout}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.logoutText, { color: colors.textPrimary }]}>Выйти из аккаунта</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: '#FF5E5E', backgroundColor: colors.surface }]}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF5E5E" />
            <Text style={[styles.logoutText, { color: '#FF5E5E' }]}>Удалить аккаунт безвозвратно</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ (ЗАЩИТА ПАРОЛЕМ) */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Ionicons name="warning" size={24} color="#FF5E5E" style={{ marginRight: 10 }} />
              <Text style={[styles.modalT, { color: '#FF5E5E', marginBottom: 0 }]}>Удаление профиля</Text>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 18 }}>
              Это действие полностью сотрет ваш прогресс лекций и достижения без возможности восстановления. Введите текущий пароль:
            </Text>

            <TextInput
              style={[styles.mInput, { borderColor: '#FF5E5E', color: colors.textPrimary }]}
              placeholder="Ваш пароль"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={true}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoFocus={true}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 10 }}>
              <TouchableOpacity onPress={() => { setDeleteModalVisible(false); setConfirmPassword(''); }}>
                <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmDelete} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FF5E5E" />
                ) : (
                  <Text style={{ color: '#FF5E5E', fontWeight: 'bold' }}>Удалить 🔴</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* МОДАЛКА СМЕНЫ НИКА */}

      <Modal visible={editModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalT, { color: colors.textPrimary }]}>Изменить имя</Text>
            <TextInput
              style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Новый никнейм"
              placeholderTextColor={colors.textMuted}
              value={tempNickname}
              onChangeText={setTempNickname}
              autoFocus={true}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 10 }}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveNewNickname} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Сохранить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  navTitle: { fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  mainCard: { padding: 30, borderRadius: 32, alignItems: 'center', borderWidth: 1, marginBottom: 20, elevation: 4, shadowOpacity: 0.05, shadowRadius: 15 },
  bigEmoji: { fontSize: 80, marginBottom: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  userName: { fontSize: 26, fontWeight: 'bold' },
  editBtn: { padding: 5 },
  avatarDesc: { fontSize: 13, textAlign: 'center', fontStyle: 'italic', marginBottom: 20 },
  quickStats: { flexDirection: 'row', width: '100%', borderTopWidth: 1, paddingTop: 20 },
  statMini: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  dividerVertical: { width: 1, height: '100%' },
  achBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 30, elevation: 2 },
  achBtnText: { fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  avatarGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  avatarBtn: { width: 55, height: 55, borderRadius: 18, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  logoutBtn: { height: 60, borderRadius: 20, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 2 },
  logoutText: { color: '#FF5E5E', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  modalBox: { padding: 30, borderRadius: 32, elevation: 10, borderWidth: 1, borderColor: 'transparent' },
  modalT: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  mInput: { height: 60, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 15, marginBottom: 20, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 25, paddingRight: 5 },
  // === СТИЛИ ПЛАШКИ ПОЧТЫ ===
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 12,
  },
  emailText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

});

export default ProfileScreen;

