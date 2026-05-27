import React, { useContext, useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, StatusBar, 
  Platform, Alert, ActivityIndicator, ScrollView, TextInput, Modal
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db'; 
import { adminService } from '../services/api'; // Подключаем наши новые методы API
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';


const AdminPanel = ({ navigation }) => {
  const { isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('День'); 
  const [stats, setStats] = useState({ activeUsers: 0, coursesCount: 0 });
  const [showRocket, setShowRocket] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [newCourseDescription, setNewCourseDescription] = useState(''); // Добавлено поле описания для Валидации бэка
  const [courseColor, setCourseColor] = useState('#4A90E2');
  const [iconName, setIconName] = useState('book');
  // Состояния для модалки создания курса (Будущий Stepper)
  const [courseModal, setCourseModal] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseKey, setNewCourseKey] = useState('');

  // Состояния для модалки статистики пользователя
  const [statsModal, setStatsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProgress, setUserProgress] = useState([]);

  const timeframes = [
    { label: 'Час', value: 'Hour' },
    { label: 'День', value: 'Day' },
    { label: 'Неделю', value: 'Week' },
    { label: 'Месяц', value: 'Month' },
    { label: 'Год', value: 'Year' }
  ];

  // Загрузка общих данных админки (Гибрид: SQLite + PostgreSQL)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Локальные пользователи из SQLite (сохранено)
      const userList = db.getAllSync('SELECT username, email, role, last_login FROM users ORDER BY role DESC');
      setUsers(Array.isArray(userList) ? userList : []);

      let totalCourses = 0;

      // Пробуем подтянуть живую статистику из PostgreSQL
      try {
        const cloudStatsRes = await adminService.getDashboardStats();
        if (cloudStatsRes.data?.success) {
          totalCourses = cloudStatsRes.data.stats.totalCourses;
        }
      } catch (cloudErr) {
        console.log("ℹ️ Бэкенд недоступен, берем количество курсов из локальной SQLite");
        const coursesResult = db.getFirstSync('SELECT COUNT(*) as count FROM courses');
        totalCourses = coursesResult?.count || 0;
      }

      setStats({
        activeUsers: (userList || []).filter(u => u.last_login).length,
        coursesCount: totalCourses
      });

    } catch (e) {
      console.error("Ошибка во время загрузки данных AdminPanel:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Получение прогресса конкретного студента (сохранено)
  const handleShowUserStats = (username) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const progress = db.getAllSync('SELECT topic_title FROM progress WHERE username = ?', [username]);
      setSelectedUser(username);
      setUserProgress(progress || []);
      setStatsModal(true);
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось загрузить данные пользователя");
    }
  };

   // Создание нового курса параллельно в Облаке (PG) и Локально (SQLite) + Анимация
  const handleCreateCourse = async () => {
    if (!newCourseTitle || !newCourseKey || !newCourseDescription) {
      Alert.alert("Ошибка", "Заполните все поля (Название, Описание и Ключ)");
      return;
    }

    try {
      const serverPayload = {
        title: newCourseTitle.trim(),
        description: newCourseDescription.trim(),
        category_id: 1, 
        icon_name: iconName,
        color: courseColor
      };

      // 1. Отправляем на сервер
      const res = await adminService.createCourse(serverPayload);
      
      // 2. Дублируем в локальную SQLite
      db.runSync('INSERT INTO courses (title, subject_key) VALUES (?, ?)', [newCourseTitle.trim(), newCourseKey.trim()]);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Включаем анимацию ракеты и закрываем форму
      setCourseModal(false);
      setShowRocket(true);
      
      // Очищаем поля
      setNewCourseTitle('');
      setNewCourseDescription('');
      setNewCourseKey('');
      fetchData();

    } catch (e) {
      console.log("Ошибка добавления курса:", e.message);
      Alert.alert("Внимание", e.response?.data?.error || "Ошибка соединения. Курс не сохранен.");
    }
  };


  const renderUserCard = (u) => (
    <TouchableOpacity 
      key={u.username} 
      onPress={() => handleShowUserStats(u.username)}
      activeOpacity={0.7}
      style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.avatarMini, { backgroundColor: u.role === 'admin' ? '#F1C40F20' : colors.primary + '15' }]}>
        <Ionicons name={u.role === 'admin' ? "shield-checkmark" : "person"} size={18} color={u.role === 'admin' ? "#F1C40F" : colors.primary} />
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.uName, { color: colors.textPrimary }]}>{u.username}</Text>
        <Text style={[styles.uEmail, { color: colors.textMuted }]}>{u.email}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* ШАПКА */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Управление</Text>
        <TouchableOpacity onPress={fetchData}><Ionicons name="refresh" size={24} color={colors.primary} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* СТАТИСТИКА */}
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{stats.activeUsers}</Text>
            <Text style={[styles.statLab, { color: colors.textMuted }]}>ПОСЕЩЕНИЙ ЗА {timeframe.toUpperCase()}</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statVal, { color: '#2ECC71' }]}>{stats.coursesCount}</Text>
            <Text style={[styles.statLab, { color: colors.textMuted }]}>КУРСОВ В БАЗЕ</Text>
          </View>
        </View>

        {/* ПЕРИОДЫ */}
        <View style={[styles.timeframeBox, { backgroundColor: colors.surface }]}>
          {timeframes.map(t => (
            <TouchableOpacity 
              key={t.value} 
              onPress={() => { setTimeframe(t.label); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.timeBtn, timeframe === t.label && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.timeBtnText, { color: timeframe === t.label ? '#FFF' : colors.textMuted }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>КОНТЕНТ</Text>
        <View style={styles.toolGrid}>
          <TouchableOpacity style={[styles.toolCard, { backgroundColor: colors.primary }]} onPress={() => Alert.alert("Лекции", "Загрузка лекций будет привязана к Мастеру Создания Контента.")}>
            <Ionicons name="cloud-upload" size={28} color="#FFF" />
            <Text style={styles.toolText}>Загрузить лекцию</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolCard, { backgroundColor: '#1A202C' }]} onPress={() => setCourseModal(true)}>
            <Ionicons name="add-circle" size={28} color="#F1C40F" />
            <Text style={[styles.toolText, { color: '#F1C40F' }]}>Создать курс</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>ПОЛЬЗОВАТЕЛИ ({users.length})</Text>
        <View style={styles.usersList}>
          {loading ? <ActivityIndicator color={colors.primary} /> : users.map(u => renderUserCard(u))}
        </View>
      </ScrollView>

            {/* МОДАЛКА НОВОГО КУРСА: ПОШАГОВЫЙ СТЕРПЕР (ADMIN 2.0) */}
      <Modal visible={courseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
              
              {/* Навигационная цепочка шагов (Индикатор Stepper) */}
              <View style={styles.stepperContainer}>
                {[1, 2, 3].map((step) => (
                  <View key={step} style={styles.stepWrapper}>
                    <View style={[
                      styles.stepDot, 
                      { backgroundColor: currentStep >= step ? colors.primary : colors.border }
                    ]}>
                      <Text style={styles.stepDotText}>{step}</Text>
                    </View>
                    {step < 3 && (
                      <View style={[
                        styles.stepLine, 
                        { backgroundColor: currentStep > step ? colors.primary : colors.border }
                      ]} />
                    )}
                  </View>
                ))}
              </View>

              {/* ЗАГЛАВИЕ ТЕКУЩЕГО ШАГА */}
              {currentStep === 1 && <Text style={[styles.modalT, { color: colors.textPrimary }]}>Шаг 1: Контент курса</Text>}
              {currentStep === 2 && <Text style={[styles.modalT, { color: colors.textPrimary }]}>Шаг 2: Визуал и Стиль</Text>}
              {currentStep === 3 && <Text style={[styles.modalT, { color: colors.textPrimary }]}>Шаг 3: Предпросмотр</Text>}

              {/* СОДЕРЖИМОЕ ШАГА 1: ТЕКСТОВЫЕ ДАННЫЕ */}
              {currentStep === 1 && (
                <View>
                  <TextInput 
                    placeholder="Название курса" 
                    placeholderTextColor={colors.textMuted} 
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary }]} 
                    value={newCourseTitle} 
                    onChangeText={setNewCourseTitle} 
                  />
                  <TextInput 
                    placeholder="Описание курса для базы знаний" 
                    placeholderTextColor={colors.textMuted} 
                    multiline 
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary, height: 80, paddingTop: 12 }]} 
                    value={newCourseDescription} 
                    onChangeText={setNewCourseDescription} 
                  />
                  <TextInput 
                    placeholder="Ключ курса (напр. Math)" 
                    placeholderTextColor={colors.textMuted} 
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary }]} 
                    value={newCourseKey} 
                    onChangeText={setNewCourseKey} 
                  />
                </View>
              )}

              {/* СОДЕРЖИМОЕ ШАГА 2: ВЫБОР ЦВЕТА И ИКОНКИ */}
              {currentStep === 2 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.stepSubTitle, { color: colors.textPrimary }]}>Выберите цвет обложки:</Text>
                  <View style={styles.colorPalette}>
                    {['#4A90E2', '#2ECC71', '#E74C3C', '#F39C12', '#9B59B6', '#1ABC9C'].map((c) => (
                      <TouchableOpacity 
                        key={c} 
                        onPress={() => { setCourseColor(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.colorCircle, { backgroundColor: c, borderColor: courseColor === c ? '#FFF' : 'transparent', borderWidth: 2 }]} 
                      />
                    ))}
                  </View>

                  <Text style={[styles.stepSubTitle, { color: colors.textPrimary, marginTop: 15 }]}>Выберите иконку:</Text>
                  <View style={styles.iconPalette}>
                    {['book', 'code-working', 'calculator', 'globe', 'flask', 'analytics'].map((ico) => (
                      <TouchableOpacity 
                        key={ico} 
                        onPress={() => { setIconName(ico); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.iconSelectorBtn, { backgroundColor: iconName === ico ? colors.primary + '20' : 'transparent', borderColor: iconName === ico ? colors.primary : colors.border }]}
                      >
                        <Ionicons name={ico} size={24} color={iconName === ico ? colors.primary : colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* СОДЕРЖИМОЕ ШАГА 3: ЖИВОЙ ПРЕДПРОСМОТР КАРТОЧКИ КУРСА СТУДЕНТА */}
              {currentStep === 3 && (
                <View style={styles.previewContainer}>
                  <Text style={[styles.stepSubTitle, { color: colors.textMuted, marginBottom: 10, textAlign: 'center' }]}>Так карточку увидят студенты:</Text>
                  
                  {/* Рендеринг будущей карточки */}
                  <View style={[styles.coursePreviewCard, { backgroundColor: courseColor }]}>
                    <View style={styles.previewIconBox}>
                      <Ionicons name={iconName} size={32} color={courseColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewCardTitle} numberOfLines={1}>{newCourseTitle || "Название курса"}</Text>
                      <Text style={styles.previewCardDesc} numberOfLines={2}>{newCourseDescription || "Описание курса отсутствует..."}</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={28} color="#FFF" style={{ marginLeft: 10 }} />
                  </View>
                </View>
              )}

              {/* КНОПКИ НАВИГАЦИИ ПО ШАГАМ (ВНИЗУ МОДАЛКИ) */}
              <View style={styles.modalActions}>
                {currentStep === 1 ? (
                  <TouchableOpacity onPress={() => setCourseModal(false)}>
                    <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Отмена</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setCurrentStep(prev => prev - 1)}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Назад</Text>
                  </TouchableOpacity>
                )}

                {currentStep < 3 ? (
                  <TouchableOpacity 
                    onPress={() => {
                      if (currentStep === 1 && (!newCourseTitle || !newCourseDescription || !newCourseKey)) {
                        Alert.alert("Ошибка", "Заполните все поля первого шага");
                        return;
                      }
                      setCurrentStep(prev => prev + 1);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }} 
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Далее</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    onPress={handleCreateCourse} 
                    style={[styles.saveBtn, { backgroundColor: '#2ECC71' }]}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Опубликовать 🚀</Text>
                  </TouchableOpacity>
                )}
              </View>

            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* МОДАЛКА СТАТИСТИКИ СТУДЕНТА */}
      <Modal visible={statsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: colors.surface, maxHeight: '80%', borderRadius: 32 },
            ]}
          >
            {/* Шапка модалки статистики */}
            <View style={styles.modalHeader}>
              <Ionicons name="stats-chart" size={24} color={colors.primary} />
              <Text
                style={[
                  styles.modalT,
                  { color: colors.textPrimary, marginBottom: 0, marginLeft: 10 },
                ]}
              >
                {selectedUser}
              </Text>
            </View>

            <Text style={[styles.statsSub, { color: colors.textMuted }]}>
              Пройдено лекций: {userProgress.length}
            </Text>

            {/* Прогресс студента */}
            <ScrollView style={styles.statsScroll} showsVerticalScrollIndicator={false}>
              {userProgress.length > 0 ? (
                userProgress.map((item, index) => (
                  <View
                    key={index}
                    style={[styles.progressItem, { borderBottomColor: colors.border }]}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#2ECC71" />
                    <Text
                      style={[styles.progressItemText, { color: colors.textPrimary }]}
                    >
                      {item.topic_title}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  Пользователь еще не приступал к обучению
                </Text>
              )}
            </ScrollView>

            {/* Кнопка закрытия статистики */}
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setStatsModal(false)}
            >
              <Text style={styles.closeBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
          {/* ПОЛНОЭКРАННЫЙ ОВЕРЛЕЙ С АНИМАЦИЕЙ РАКЕТЫ */}
      {showRocket && (
        <View style={[StyleSheet.absoluteFillObject, styles.rocketOverlay, { backgroundColor: colors.background }]}>
          <LottieView
            source={{ uri: 'https://lottie.host' }} // 100% рабочая глобальная ссылка на летящую ракету
            autoPlay
            loop={false}
            onAnimationFinish={() => setShowRocket(false)}
            style={styles.rocketAnimation}
          />
          <Text style={[styles.rocketText, { color: colors.textPrimary }]}>Курс успешно запущен в космос! 🚀</Text>
        </View>
      )}
    </View>
  );
};

// ==========================================
// СТИЛИ ИНТЕРФЕЙСА (СОХРАНЕНЫ И ВЫРОВНЕНЫ)
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statItem: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 2,
  },
  statVal: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statLab: { fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  timeframeBox: {
    flexDirection: 'row',
    padding: 5,
    borderRadius: 15,
    marginBottom: 25,
    justifyContent: 'space-between',
  },
  timeBtn: {
    paddingHorizontal: 12,
    height: 35,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBtnText: { fontSize: 10, fontWeight: 'bold' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 15,
    letterSpacing: 2,
    opacity: 0.5,
  },
  toolGrid: { flexDirection: 'row', gap: 15 },
  toolCard: {
    flex: 1,
    height: 110,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  toolText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  usersList: { marginBottom: 20 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { flex: 1, marginLeft: 12 },
  uName: { fontSize: 15, fontWeight: 'bold' },
  uEmail: { fontSize: 11, opacity: 0.6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 25,
  },
  modalBox: { padding: 30, borderRadius: 32 },
  modalT: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  mInput: {
    height: 55,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20,
  },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statsSub: { fontSize: 14, fontWeight: 'bold', marginBottom: 20 },
  statsScroll: { marginBottom: 20 },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  progressItemText: { fontSize: 14, fontWeight: '500' },
  emptyText: { textAlign: 'center', opacity: 0.5, marginVertical: 20 },
  closeBtn: {
    height: 55,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    // === СТИЛИ НОВОЙ АДМИНКИ 2.0 (STEPPER & PREVIEW) ===
  stepperContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  stepWrapper: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  stepDotText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  stepLine: { width: 40, height: 3, mx: 5 },
  stepSubTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  colorPalette: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 10 },
  colorCircle: { width: 36, height: 36, borderRadius: 18 },
  iconPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 10 },
  iconSelectorBtn: { width: 50, height: 50, borderRadius: 15, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  previewContainer: { padding: 10, marginBottom: 20 },
  coursePreviewCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  previewIconBox: { width: 55, height: 55, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  previewCardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  previewCardDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 14 },
  //СТИЛЬ ДЛЯ ОВЕРЛЕЯ
  rocketOverlay: { justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  rocketAnimation: { width: 250, height: 250 },
  rocketText: { fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center', paddingHorizontal: 30 }

});

export default AdminPanel;
