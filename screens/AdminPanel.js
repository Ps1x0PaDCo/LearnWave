import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Platform, Alert, ActivityIndicator, ScrollView, TextInput, Modal, Switch
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db';
import { adminService } from '../services/api';
import Ionicons from '@expo/vector-icons/Ionicons';

// ─── Haptics: безопасная обёртка для веба ───────────────────────────────────
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

const COURSE_KEY_OPTIONS = [
  { label: 'Математика', value: 'math', icon: 'calculator' },
  { label: 'Физика', value: 'physics', icon: 'planet' },
  { label: 'Химия', value: 'chemistry', icon: 'flask' },
  { label: 'Биология', value: 'biology', icon: 'leaf' },
  { label: 'История', value: 'history', icon: 'hourglass' },
  { label: 'География', value: 'geography', icon: 'earth' },
  { label: 'Английский', value: 'english', icon: 'language' },
  { label: 'Информатика', value: 'computer_science', icon: 'desktop' },
  { label: 'Python', value: 'python_dev', icon: 'code-working' },
  { label: 'Web-разработка', value: 'web_dev', icon: 'globe' },
];

const CATEGORY_OPTIONS = [
  { id: 1, title: 'Точные науки', icon: 'calculator', color: '#4A90E2' },
  { id: 2, title: 'Естественные науки', icon: 'leaf', color: '#2ECC71' },
  { id: 3, title: 'IT и программирование', icon: 'code-slash', color: '#9B59B6' },
  { id: 4, title: 'Гуманитарные науки', icon: 'library', color: '#F39C12' },
  { id: 5, title: 'Языки', icon: 'language', color: '#1ABC9C' },
  { id: 6, title: 'Прочие', icon: 'albums', color: '#64748B' },
];

const CATEGORY_BY_KEY = {
  math: 1,
  physics: 2,
  chemistry: 2,
  biology: 2,
  computer_science: 3,
  python_dev: 3,
  web_dev: 3,
  history: 4,
  geography: 4,
  english: 5,
};

const FORMAT_GUIDES = {
  1: {
    title: 'Точные науки',
    short: '### Теория • [FORMULA]a^2+b^2=c^2[/FORMULA] • ### Пример • ### Важный совет',
    placeholder: '### Короткая теория\n\nОбъясните правило простыми словами и покажите, где оно применяется.\n\n[FORMULA]a^2+b^2=c^2[/FORMULA]\n\n### Пример\n\nРазберите один короткий пример по шагам.\n\n### Важный совет\n\nЗаписывать не только формулу, но и смысл каждой величины.',
    details: [
      'Для формул используйте [FORMULA]...[/FORMULA].',
      'Структура: теория, формула, пример, важный совет, затем квиз.',
      'Лучше объяснять каждое обозначение: что такое a, b, c и в каких единицах они измеряются.',
    ],
  },
  2: {
    title: 'Естественные науки',
    short: '### Смысл явления • [FORMULA]E_k=mv^2/2[/FORMULA] • ### Где встречается',
    placeholder: '### Короткая теория\n\nОпишите явление и его физический или биологический смысл.\n\n[FORMULA]E_k=mv^2/2[/FORMULA]\n\n### Где встречается\n\nПриведите пример из жизни или задачи.\n\n### Важный совет\n\nСначала определить, какие величины известны, и только потом выбирать формулу.',
    details: [
      'Формулы нужны только там, где они действительно помогают понять тему.',
      'Хороший блок: явление, объяснение величин, пример, типичная ошибка.',
      'Для химии и биологии можно делать акцент на процессах, схемах и причинно-следственных связях.',
    ],
  },
  3: {
    title: 'IT и программирование',
    short: '### Идея • `код` • ### Пример • ### Частая ошибка',
    placeholder: '### Короткая теория\n\nОбъясните идею без перегруза терминами.\n\n### Пример\n\n`let count = 0;`\n\n### Частая ошибка\n\nОпишите, где обычно путаются новички.\n\n### Важный совет\n\nЛучше запустить маленький пример, чем читать правило без практики.',
    details: [
      'Код можно выделять обратными кавычками: `const x = 10;`.',
      'Для тем по программированию полезны блоки: идея, пример кода, ошибка, мини-практика.',
      'Формулы обычно не нужны, если тема не про алгоритмическую сложность или вычисления.',
    ],
  },
  4: {
    title: 'Гуманитарные науки',
    short: '### Понятие • ### Почему важно • ### Пример ситуации • ### Важный совет',
    placeholder: '### Короткая теория\n\nДайте определение понятия простыми словами.\n\n### Почему это важно\n\nОбъясните, где тема встречается в жизни или практике.\n\n### Пример ситуации\n\nКоротко разберите пример без формул.\n\n### Важный совет\n\nСначала определить участников ситуации, затем права, обязанности и возможные последствия.',
    details: [
      'Для правоведения формулы не нужны: лучше использовать определения, условия, примеры ситуаций.',
      'Удобная структура: понятие, признаки, пример, типичная ошибка, важный совет.',
      'Если есть термин, рядом стоит дать объяснение простым языком.',
    ],
  },
  5: {
    title: 'Языки',
    short: '### Правило • ### Пример • ### Мини-диалог • ### Важный совет',
    placeholder: '### Короткая теория\n\nОбъясните правило и когда оно используется.\n\n### Пример\n\nI have already finished my homework.\n\n### Мини-диалог\n\nA: Have you done it?\nB: Yes, I have.\n\n### Важный совет\n\nНовое правило лучше сразу закреплять в короткой фразе.',
    details: [
      'Для языков полезны примеры, мини-диалоги и типичные ошибки.',
      'Формулы не нужны, если это не условное обозначение грамматической схемы.',
      'Хорошо работает структура: правило, пример, перевод, ошибка, совет.',
    ],
  },
  6: {
    title: 'Прочие',
    short: '### Идея • ### Пример • ### Проверка понимания • ### Важный совет',
    placeholder: '### Короткая теория\n\nОбъясните тему простыми словами и без лишней формальности.\n\n### Пример\n\nПокажите короткий пример, который помогает понять смысл.\n\n### Проверка понимания\n\nСформулируйте, что пользователь должен запомнить.\n\n### Важный совет\n\nСделайте совет нейтральным и полезным.',
    details: [
      'Раздел подходит для нестандартных, демонстрационных и экспериментальных курсов.',
      'Формулы использовать необязательно: структура зависит от темы.',
      'Лучше держать материал коротким, понятным и с одним проверочным вопросом.',
    ],
  },
};

const getFormatGuide = (categoryId) => FORMAT_GUIDES[categoryId] || FORMAT_GUIDES[4];

const normalizeMarkdownContent = (value = '') => String(value)
  .replace(/\\n/g, '\n')
  .replace(/^(#{1,6})(\S)/gm, '$1 $2');

const AdminPanel = ({ navigation }) => {
  const { isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  // ─── Общее состояние ────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('День');
  const [stats, setStats] = useState({ activeUsers: 0, coursesCount: 0 });
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Модал: статистика пользователя ─────────────────────────────────────
  const [statsModal, setStatsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProgress, setUserProgress] = useState([]);

  // ─── Модал: создание курса (3 шага) ─────────────────────────────────────
  const [courseModal, setCourseModal] = useState(false);
  const [courseStep, setCourseStep] = useState(1);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseKey, setNewCourseKey] = useState('');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [courseColor, setCourseColor] = useState('#4A90E2');
  const [categoryId, setCategoryId] = useState(1);
  const [iconName, setIconName] = useState('book');
  const [attachLectureToCourse, setAttachLectureToCourse] = useState(false);
  const [publishCourseNow, setPublishCourseNow] = useState(true);
  const [isCourseSubmitting, setIsCourseSubmitting] = useState(false);
  const [isCourseKeyDropdownOpen, setIsCourseKeyDropdownOpen] = useState(false);

  // ─── Модал: загрузка лекции (3 шага) ────────────────────────────────────
  const [lectureModal, setLectureModal] = useState(false);
  const [lectureStep, setLectureStep] = useState(1);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null); // { id, title, subject_key }
  const [newLectureTitle, setNewLectureTitle] = useState('');
  const [newLectureContent, setNewLectureContent] = useState('');
  const [lectureContentMode, setLectureContentMode] = useState('text'); // 'text' | 'file'
  const [lectureFileName, setLectureFileName] = useState('');
  const [formatHelpModal, setFormatHelpModal] = useState(false);
  const [formatHelpCategoryId, setFormatHelpCategoryId] = useState(4);
  const [deleteCourseModal, setDeleteCourseModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [editCourseModal, setEditCourseModal] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState(null);
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCourseKey, setEditCourseKey] = useState('');
  const [editCourseDescription, setEditCourseDescription] = useState('');
  const [editCourseColor, setEditCourseColor] = useState('#4A90E2');
  const [editCategoryId, setEditCategoryId] = useState(1);
  const [editIconName, setEditIconName] = useState('book');
  const [editIsPublished, setEditIsPublished] = useState(false);
  const [isCourseUpdating, setIsCourseUpdating] = useState(false);
  const [editTopicModal, setEditTopicModal] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicDescription, setEditTopicDescription] = useState('');
  const [editTopicContent, setEditTopicContent] = useState('');
  const [editTopicAnswer, setEditTopicAnswer] = useState('');
  const [editQuizQuestion, setEditQuizQuestion] = useState('');
  const [editQuizOptionA, setEditQuizOptionA] = useState('');
  const [editQuizOptionB, setEditQuizOptionB] = useState('');
  const [editQuizOptionC, setEditQuizOptionC] = useState('');
  const [editQuizOptionD, setEditQuizOptionD] = useState('');
  const [editQuizExplanation, setEditQuizExplanation] = useState('');
  const [isTopicUpdating, setIsTopicUpdating] = useState(false);
  const [isTopicDeleting, setIsTopicDeleting] = useState(false);

  const timeframes = [
    { label: 'Час',    value: 'Hour'  },
    { label: 'День',   value: 'Day'   },
    { label: 'Неделя', value: 'Week'  },
    { label: 'Месяц',  value: 'Month' },
    { label: 'Год',    value: 'Year'  },
  ];

  // ─── Загрузка данных ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Пользователи из SQLite (offline-first)
      let userList = db.getAllSync('SELECT username, email, role FROM users ORDER BY role DESC');
      try {
        const usersRes = await adminService.getUsers();
        if (Array.isArray(usersRes.data?.users)) {
          userList = usersRes.data.users;
        }
      } catch (userErr) {
        console.log('Admin users fallback:', userErr?.message);
      }
      setUsers(Array.isArray(userList) ? userList : []);

      // Курсы для лекций из SQLite
      const courseList = db.getAllSync('SELECT id, title, subject_key FROM courses ORDER BY title ASC');
      setAvailableCourses(Array.isArray(courseList) ? courseList : []);

      let totalCourses = 0;
      try {
        const cloudStatsRes = await adminService.getDashboardStats();
        if (cloudStatsRes.data?.success) {
          totalCourses = cloudStatsRes.data.stats.totalCourses;
        } else {
          const coursesRes = await adminService.getCourses();
          totalCourses = coursesRes.data?.length || 0;
        }

        const coursesRes = await adminService.getCourses();
        const serverCourses = coursesRes.data?.categories
          ?.flatMap(category => (category.subjects || []).map(course => ({
            id: course.id,
            title: course.title,
            description: course.description,
            subject_key: course.subject_key,
            category_id: category.id,
            icon_name: course.icon_name,
            color: course.color || category.color,
            is_published: course.is_published !== false,
            topic_count: course.topic_count || 0,
          }))) || [];
        if (serverCourses.length > 0) {
          setAvailableCourses(serverCourses.sort((a, b) => a.title.localeCompare(b.title)));
          totalCourses = serverCourses.length;
        }
        const adminCoursesRes = await adminService.getAdminCourses().catch(() => null);
        if (Array.isArray(adminCoursesRes?.data?.courses)) {
          setAvailableCourses(adminCoursesRes.data.courses.sort((a, b) => a.title.localeCompare(b.title)));
          totalCourses = adminCoursesRes.data.courses.length;
        }
        const topicsRes = await adminService.getTopics().catch(() => null);
        if (Array.isArray(topicsRes?.data?.topics)) {
          setAvailableTopics(topicsRes.data.topics);
        }
      } catch {
        const coursesResult = db.getFirstSync('SELECT COUNT(*) as count FROM courses');
        totalCourses = coursesResult?.count || 0;
      }

      setStats({
        activeUsers: userList.length === 0 ? 1 : userList.length,
        coursesCount: totalCourses,
      });
    } catch (e) {
      console.error('Ошибка AdminPanel:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getCourseCategoryId = (course) => course?.category_id || getCategoryIdByKey(course?.subject_key || '') || 4;
  const openFormatHelp = (nextCategoryId) => {
    setFormatHelpCategoryId(nextCategoryId || 4);
    setFormatHelpModal(true);
  };

  // ─── Статистика пользователя ──────────────────────────────────────────────
  const handleShowUserStats = async (user) => {
    haptic.impact('Light');
    const username = typeof user === 'string' ? user : user?.username;
    setSelectedUser(typeof user === 'string' ? user : user);
    try {
      const response = await adminService.getUserProgress(user);
      const progress = response.data?.progress || response.data;
      if (Array.isArray(progress)) {
        setUserProgress(progress.map(p => {
          const topicId = p.topic_id || p.id || 1;
          const localTopic = availableTopics.find(topic =>
            Number(topic.id) === Number(topicId) || Number(topic.server_id) === Number(topicId)
          );
          const subjectKey = p.subject_key || localTopic?.subject_key || '';
          return {
            topic_id: topicId,
            topic_title: p.topic_title || p.title || localTopic?.title || '',
            course_title: p.course_title || (subjectKey ? getCourseTitleBySubject(subjectKey) : ''),
            subject_key: subjectKey,
          };
        }));
      } else {
        setUserProgress([]);
      }
    } catch {
      try {
        const localProgress = db.getAllSync('SELECT topic_id FROM progress WHERE username = ?', [username]);
        setUserProgress(localProgress || []);
      } catch (localErr) {
        console.error('Ошибка прогресса:', localErr);
        setUserProgress([]);
      }
    }
    setStatsModal(true);
  };

  // ─── Создание курса ───────────────────────────────────────────────────────
  const resetCourseModal = () => {
    setCourseModal(false);
    setCourseStep(1);
    setNewCourseTitle('');
    setNewCourseKey('');
    setNewCourseDescription('');
    setCourseColor('#4A90E2');
    setCategoryId(1);
    setIconName('book');
    setAttachLectureToCourse(false);
    setPublishCourseNow(true);
    setIsCourseSubmitting(false);
    setIsCourseKeyDropdownOpen(false);
    setNewLectureTitle('');
    setNewLectureContent('');
    setLectureContentMode('text');
    setLectureFileName('');
  };

  const normalizeCourseKey = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

  const getCategoryIdByKey = (key) => CATEGORY_BY_KEY[normalizeCourseKey(key)] || 1;

  const getCourseValidationError = () => {
    const title = newCourseTitle.trim();
    const description = newCourseDescription.trim();
    const key = normalizeCourseKey(newCourseKey);
    if (title.length < 3) return 'Название курса должно быть не короче 3 символов.';
    if (description.length < 10) return 'Добавьте описание курса хотя бы в 10 символов.';
    if (key.length < 3) return 'Ключ курса должен быть не короче 3 символов.';
    if (!/^[a-z0-9_]+$/.test(key)) return 'Ключ может содержать только латинские буквы, цифры и подчёркивание.';
    const duplicate = availableCourses.some(course =>
      normalizeCourseKey(course.subject_key || '') === key ||
      course.title?.trim().toLowerCase() === title.toLowerCase()
    );
    if (duplicate) return 'Курс с таким названием или ключом уже есть.';
    if (attachLectureToCourse) {
      if (newLectureTitle.trim().length < 3) return 'Название первой лекции должно быть не короче 3 символов.';
      if (newLectureContent.trim().length < 20) return 'Содержимое первой лекции должно быть не короче 20 символов.';
    }
    return null;
  };

  const getCourseStepValidationError = () => {
    const title = newCourseTitle.trim();
    const description = newCourseDescription.trim();
    const key = normalizeCourseKey(newCourseKey);

    if (courseStep === 1) {
      if (title.length < 3) return 'Название курса должно быть не короче 3 символов.';
      if (description.length < 10) return 'Добавьте описание курса хотя бы в 10 символов.';
      if (key.length < 3) return 'Выберите ключ из списка или введите свой технический ключ.';
      if (!/^[a-z0-9_]+$/.test(key)) return 'Ключ может содержать только латинские буквы, цифры и подчёркивание.';

      const duplicate = availableCourses.some(course =>
        normalizeCourseKey(course.subject_key || '') === key ||
        course.title?.trim().toLowerCase() === title.toLowerCase()
      );
      if (duplicate) return 'Курс с таким названием или ключом уже есть.';
    }

    if (courseStep === 3 && attachLectureToCourse) {
      if (newLectureTitle.trim().length < 3) return 'Название первой темы должно быть не короче 3 символов.';
      if (newLectureContent.trim().length < 20) return 'Содержимое первой темы должно быть не короче 20 символов.';
    }

    return null;
  };

  const handleCreateCourse = async () => {
    const validationError = getCourseValidationError();
    if (validationError) {
      Alert.alert('Ошибка', validationError);
      return;
    }

    const title = newCourseTitle.trim();
    const subjectKey = normalizeCourseKey(newCourseKey);
    const description = newCourseDescription.trim();
    setIsCourseSubmitting(true);

    try {
      const response = await adminService.createCourse({
        title,
        description,
        category_id: categoryId,
        icon_name: iconName,
        color: courseColor,
        subject_key: subjectKey,
        is_published: publishCourseNow,
      });
      const createdCourse = response.data?.course || response.data || {};
      const courseId = createdCourse.id || createdCourse.course_id;

      if (courseId) {
        db.runSync(
          'INSERT OR REPLACE INTO courses (id, title, subject_key) VALUES (?, ?, ?)',
          [courseId, title, subjectKey]
        );
      } else {
        db.runSync(
          'INSERT OR IGNORE INTO courses (title, subject_key) VALUES (?, ?)',
          [title, subjectKey]
        );
      }

      if (attachLectureToCourse) {
        await adminService.createLecture({
          title: newLectureTitle.trim(),
          course_id: courseId || null,
          subject_key: subjectKey,
          content: newLectureContent.trim(),
        });
        db.runSync(
          'INSERT OR REPLACE INTO topics (subject_key, title, content) VALUES (?, ?, ?)',
          [subjectKey, newLectureTitle.trim(), newLectureContent.trim()]
        );
      }

      haptic.notification('Success');
      resetCourseModal();
      fetchData();
      Alert.alert(
        'Готово',
        attachLectureToCourse
          ? `Курс «${title}» создан вместе с первой лекцией.`
          : `Курс «${title}» успешно добавлен.`
      );
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось создать курс.');
    } finally {
      setIsCourseSubmitting(false);
    }
  };

  // ─── Загрузка лекции ──────────────────────────────────────────────────────
  const resetLectureModal = () => {
    setLectureModal(false);
    setLectureStep(1);
    setSelectedCourse(null);
    setNewLectureTitle('');
    setNewLectureContent('');
    setLectureContentMode('text');
    setLectureFileName('');
  };

  // Имитация выбора файла (expo-document-picker)
  const handlePickFile = async () => {
    try {
      // expo-document-picker должен быть установлен: npx expo install expo-document-picker
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/markdown', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        setLectureFileName(file.name);
        // Читаем содержимое текстового файла
        if (file.mimeType !== 'application/pdf') {
          const FileSystem = require('expo-file-system');
          const content = await FileSystem.readAsStringAsync(file.uri);
          setNewLectureContent(content);
        } else {
          setNewLectureContent(`[PDF файл: ${file.name}]`);
        }
      }
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось открыть файл. Переключитесь на режим ввода текста.');
    }
  };

  const handleCreateLecture = async () => {
    if (!selectedCourse || !newLectureTitle.trim() || !newLectureContent.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля.');
      return;
    }
    try {
      await adminService.createLecture({
        title: newLectureTitle.trim(),
        course_id: selectedCourse.id,
        subject_key: selectedCourse.subject_key,
        content: newLectureContent.trim(),
      });
      db.runSync(
        'INSERT OR REPLACE INTO topics (subject_key, title, content) VALUES (?, ?, ?)',
        [selectedCourse.subject_key, newLectureTitle.trim(), newLectureContent.trim()]
      );
      haptic.notification('Success');
      resetLectureModal();
      fetchData();
      Alert.alert('✅ Лекция добавлена!', `«${newLectureTitle.trim()}» добавлена в курс «${selectedCourse.title}».`);
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось создать лекцию.');
    }
  };

  const resetDeleteCourseModal = () => {
    setDeleteCourseModal(false);
    setCourseToDelete(null);
    setIsDeletingCourse(false);
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) {
      Alert.alert('Ошибка', 'Выберите курс для удаления.');
      return;
    }

    const deleteLocally = () => {
      db.runSync('DELETE FROM topics WHERE subject_key = ?', [courseToDelete.subject_key]);
      db.runSync('DELETE FROM courses WHERE id = ? OR subject_key = ?', [courseToDelete.id, courseToDelete.subject_key]);
    };

    const runDelete = async () => {
      setIsDeletingCourse(true);
      try {
        try {
          await adminService.deleteCourse(courseToDelete.id);
        } catch (serverError) {
          console.log('Delete course server fallback:', serverError.response?.data?.error || serverError.message);
        }
        deleteLocally();
        haptic.notification('Success');
        resetDeleteCourseModal();
        fetchData();
        Alert.alert('Курс удалён', `«${courseToDelete.title}» удалён из списка курсов.`);
      } catch (e) {
        Alert.alert('Ошибка', e.message || 'Не удалось удалить курс.');
      } finally {
        setIsDeletingCourse(false);
      }
    };

    Alert.alert(
      'Удалить курс?',
      `Курс «${courseToDelete.title}» и его локальные темы будут удалены.`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: runDelete },
      ]
    );
  };

  const resetEditCourseModal = () => {
    setEditCourseModal(false);
    setCourseToEdit(null);
    setEditCourseTitle('');
    setEditCourseKey('');
    setEditCourseDescription('');
    setEditCourseColor('#4A90E2');
    setEditCategoryId(1);
    setEditIconName('book');
    setEditIsPublished(false);
    setIsCourseUpdating(false);
  };

  const openCourseEditor = (course) => {
    setCourseToEdit(course);
    setEditCourseTitle(course.title || '');
    setEditCourseKey(course.subject_key || '');
    setEditCourseDescription(course.description || '');
    setEditCourseColor(course.color || '#4A90E2');
    setEditCategoryId(course.category_id || getCategoryIdByKey(course.subject_key || ''));
    setEditIconName(course.icon_name || 'book');
    setEditIsPublished(course.is_published !== false);
    haptic.impact('Light');
  };

  const getEditCourseError = () => {
    const title = editCourseTitle.trim();
    const description = editCourseDescription.trim();
    const key = normalizeCourseKey(editCourseKey);
    if (!courseToEdit) return 'Выберите курс для редактирования.';
    if (title.length < 3) return 'Название курса должно быть не короче 3 символов.';
    if (description.length < 10) return 'Добавьте описание курса хотя бы в 10 символов.';
    if (key.length < 3) return 'Ключ курса должен быть не короче 3 символов.';
    const duplicate = availableCourses.some(course =>
      course.id !== courseToEdit.id &&
      (normalizeCourseKey(course.subject_key || '') === key ||
        course.title?.trim().toLowerCase() === title.toLowerCase())
    );
    if (duplicate) return 'Курс с таким названием или ключом уже есть.';
    return null;
  };

  const handleUpdateCourse = async () => {
    const error = getEditCourseError();
    if (error) {
      Alert.alert('Проверьте данные', error);
      return;
    }

    setIsCourseUpdating(true);
    try {
      await adminService.updateCourse(courseToEdit.id, {
        title: editCourseTitle.trim(),
        description: editCourseDescription.trim(),
        category_id: editCategoryId,
        icon_name: editIconName,
        color: editCourseColor,
        subject_key: normalizeCourseKey(editCourseKey),
        is_published: editIsPublished,
      });
      haptic.notification('Success');
      resetEditCourseModal();
      fetchData();
      Alert.alert('Курс обновлён', editIsPublished ? 'Изменения опубликованы в каталоге.' : 'Курс сохранён как черновик.');
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось обновить курс.');
    } finally {
      setIsCourseUpdating(false);
    }
  };

  const resetEditTopicModal = () => {
    setEditTopicModal(false);
    setTopicToEdit(null);
    setEditTopicTitle('');
    setEditTopicDescription('');
    setEditTopicContent('');
    setEditTopicAnswer('');
    setEditQuizQuestion('');
    setEditQuizOptionA('');
    setEditQuizOptionB('');
    setEditQuizOptionC('');
    setEditQuizOptionD('');
    setEditQuizExplanation('');
    setIsTopicUpdating(false);
    setIsTopicDeleting(false);
  };

  const openTopicEditor = (topic) => {
    let parsedQuiz = {};
    try {
      parsedQuiz = topic.quiz_question ? JSON.parse(topic.quiz_question) : {};
    } catch {
      parsedQuiz = {};
    }
    const options = Array.isArray(parsedQuiz.options) ? parsedQuiz.options : [];

    setTopicToEdit(topic);
    setEditTopicTitle(topic.title || '');
    setEditTopicDescription(topic.description || '');
    setEditTopicContent(topic.content || '');
    setEditQuizQuestion(parsedQuiz.question || '');
    setEditQuizOptionA(options[0] || '');
    setEditQuizOptionB(options[1] || '');
    setEditQuizOptionC(options[2] || '');
    setEditQuizOptionD(options[3] || '');
    setEditTopicAnswer(parsedQuiz.correct || topic.quiz_answer || '');
    setEditQuizExplanation(parsedQuiz.explanation || '');
    haptic.impact('Light');
  };

  const handleUpdateTopic = async () => {
    if (!topicToEdit) {
      Alert.alert('Ошибка', 'Выберите тему.');
      return;
    }
    const normalizedContent = normalizeMarkdownContent(editTopicContent.trim());
    if (editTopicTitle.trim().length < 3 || normalizedContent.length < 20) {
      Alert.alert('Проверьте данные', 'Название и материал темы должны быть заполнены.');
      return;
    }
    const quizOptions = [editQuizOptionA, editQuizOptionB, editQuizOptionC, editQuizOptionD]
      .map(option => option.trim())
      .filter(Boolean);
    const hasQuiz = editQuizQuestion.trim() || quizOptions.length > 0 || editTopicAnswer.trim();
    if (hasQuiz && (editQuizQuestion.trim().length < 5 || quizOptions.length < 2 || !editTopicAnswer.trim())) {
      Alert.alert('Проверьте квиз', 'Для квиза нужны вопрос, минимум два варианта ответа и правильный ответ.');
      return;
    }
    if (hasQuiz && !quizOptions.includes(editTopicAnswer.trim())) {
      Alert.alert('Проверьте квиз', 'Правильный ответ должен совпадать с одним из вариантов.');
      return;
    }
    const quizPayload = hasQuiz
      ? JSON.stringify({
          question: editQuizQuestion.trim(),
          options: quizOptions,
          correct: editTopicAnswer.trim(),
          explanation: editQuizExplanation.trim(),
        })
      : '';

    setIsTopicUpdating(true);
    try {
      const response = await adminService.updateTopic(topicToEdit.id, {
        title: editTopicTitle.trim(),
        description: editTopicDescription.trim(),
        content: normalizedContent,
        quiz_question: quizPayload,
        quiz_answer: editTopicAnswer.trim(),
        difficulty: topicToEdit.difficulty || 1,
      });
      const savedTopic = response?.data?.topic || {
        ...topicToEdit,
        title: editTopicTitle.trim(),
        description: editTopicDescription.trim(),
        content: normalizedContent,
        quiz_question: quizPayload,
        quiz_answer: editTopicAnswer.trim(),
        difficulty: topicToEdit.difficulty || 1,
      };
      try {
        db.runSync(
          `INSERT OR REPLACE INTO topics
            (id, server_id, subject_key, title, description, content, quiz_question, quiz_answer, difficulty, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            savedTopic.id || topicToEdit.id,
            savedTopic.server_id || savedTopic.id || topicToEdit.server_id || topicToEdit.id,
            savedTopic.subject_key || topicToEdit.subject_key,
            savedTopic.title || editTopicTitle.trim(),
            savedTopic.description || editTopicDescription.trim(),
            savedTopic.content || normalizedContent,
            savedTopic.quiz_question || quizPayload,
            savedTopic.quiz_answer || editTopicAnswer.trim(),
            savedTopic.difficulty || topicToEdit.difficulty || 1,
          ]
        );
      } catch (localErr) {
        console.log('Topic local update fallback:', localErr?.message);
      }
      haptic.notification('Success');
      resetEditTopicModal();
      fetchData();
      Alert.alert('Тема обновлена', 'Изменения сохранены.');
    } catch (e) {
      const status = e.response?.status;
      const serverMessage = e.response?.data?.error;
      const message = status === 404
        ? 'Сервер ещё не подхватил маршрут редактирования темы. Перезапустите backend и попробуйте снова.'
        : status === 403
          ? 'Сервер отклонил запрос: нужен вход под админ-аккаунтом.'
          : serverMessage || 'Не удалось обновить тему.';
      Alert.alert('Ошибка', message);
    } finally {
      setIsTopicUpdating(false);
    }
  };

  const handleDeleteTopic = () => {
    if (!topicToEdit) {
      Alert.alert('Ошибка', 'Выберите тему для удаления.');
      return;
    }

    const runDelete = async () => {
      setIsTopicDeleting(true);
      try {
        await adminService.deleteTopic(topicToEdit.id);
        try {
          db.runSync('DELETE FROM topics WHERE id = ? OR server_id = ?', [topicToEdit.id, topicToEdit.id]);
          db.runSync('DELETE FROM progress WHERE topic_id = ?', [topicToEdit.id]);
          db.runSync('DELETE FROM user_progress WHERE topic_id = ?', [topicToEdit.id]);
        } catch (localErr) {
          console.log('Delete topic local fallback:', localErr?.message);
        }
        haptic.notification('Success');
        resetEditTopicModal();
        fetchData();
        Alert.alert('Тема удалена', 'Тема удалена из курса и прогресса пользователей.');
      } catch (e) {
        Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось удалить тему.');
      } finally {
        setIsTopicDeleting(false);
      }
    };

    Alert.alert(
      'Удалить тему?',
      `Тема «${topicToEdit.title}» будет удалена из курса. Прогресс по этой теме тоже очистится.`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: runDelete },
      ]
    );
  };

  const getCourseTitleBySubject = (subjectKey) => {
    const course = availableCourses.find(item => item.subject_key === subjectKey);
    return course?.title || subjectKey || 'Курс';
  };

  const getTopicQuizInfo = (topic) => {
    try {
      const parsed = topic.quiz_question ? JSON.parse(topic.quiz_question) : null;
      const optionCount = Array.isArray(parsed?.options) ? parsed.options.length : 0;
      return optionCount > 0 ? `${optionCount} ответа` : 'квиз не заполнен';
    } catch {
      return 'квиз требует проверки';
    }
  };

  const sortedTopics = [...availableTopics].sort((a, b) => {
    const courseA = getCourseTitleBySubject(a.subject_key);
    const courseB = getCourseTitleBySubject(b.subject_key);
    return `${courseA} ${a.title}`.localeCompare(`${courseB} ${b.title}`);
  });

  // ─── Валидация шагов ──────────────────────────────────────────────────────
  const canAdvanceCourse = () => {
    return !getCourseStepValidationError();
  };

  const canAdvanceLecture = () => {
    if (lectureStep === 1) return !!selectedCourse;
    if (lectureStep === 2) return newLectureTitle.trim().length > 0;
    return true;
  };

  // ─── Карточка пользователя ────────────────────────────────────────────────
  const renderUserCard = (u) => (
    <TouchableOpacity
      key={u.id || u.email || u.username}
      onPress={() => handleShowUserStats(u)}
      activeOpacity={0.7}
      style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.avatarMini, { backgroundColor: u.role === 'admin' ? '#F1C40F20' : colors.primary + '15' }]}>
        <Ionicons
          name={u.role === 'admin' ? 'shield-checkmark' : 'person'}
          size={18}
          color={u.role === 'admin' ? '#F1C40F' : colors.primary}
        />
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.uName, { color: colors.textPrimary }]}>{u.username}</Text>
        <Text style={[styles.uEmail, { color: colors.textMuted }]}>{u.email}</Text>
      </View>
      <View style={[styles.roleBadge, { backgroundColor: u.role === 'admin' ? '#F1C40F20' : colors.primary + '15' }]}>
        <Text style={{ fontSize: 10, fontWeight: 'bold', color: u.role === 'admin' ? '#F1C40F' : colors.primary }}>
          {u.role === 'admin' ? 'ADMIN' : 'USER'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ─── Рендер stepper ───────────────────────────────────────────────────────
  const renderStepper = (currentStep, total = 3) => (
    <View style={styles.stepperContainer}>
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <View key={step} style={styles.stepWrapper}>
          <View style={[styles.stepDot, { backgroundColor: currentStep >= step ? colors.primary : colors.border }]}>
            {currentStep > step
              ? <Ionicons name="checkmark" size={12} color="#FFF" />
              : <Text style={styles.stepDotText}>{step}</Text>
            }
          </View>
          {step < total && (
            <View style={[styles.stepLine, { backgroundColor: currentStep > step ? colors.primary : colors.border }]} />
          )}
        </View>
      ))}
    </View>
  );

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Шапка */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (isSearchActive) { setIsSearchActive(false); setSearchQuery(''); }
            else navigation.goBack();
          }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>

        {isSearchActive ? (
          <TextInput
            placeholder="Поиск пользователей..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={{ flex: 1, color: colors.textPrimary, fontSize: 16, paddingHorizontal: 10 }}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        ) : (
          <Text style={[styles.title, { color: colors.textPrimary }]}>Панель администратора</Text>
        )}

        <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => { setIsSearchActive(!isSearchActive); if (isSearchActive) setSearchQuery(''); haptic.impact('Light'); }}>
            <Ionicons name={isSearchActive ? 'close' : 'search'} size={24} color={colors.primary} />
          </TouchableOpacity>
          {!isSearchActive && (
            <TouchableOpacity onPress={fetchData}>
              <Ionicons name="refresh" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Статистика */}
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{stats.activeUsers}</Text>
            <Text style={[styles.statLab, { color: colors.textMuted }]}>ПОЛЬЗОВАТЕЛЕЙ</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statVal, { color: '#2ECC71' }]}>{stats.coursesCount}</Text>
            <Text style={[styles.statLab, { color: colors.textMuted }]}>КУРСОВ</Text>
          </View>
        </View>

        {/* Таймфрейм */}
        <View style={[styles.timeframeBox, { backgroundColor: colors.surface }]}>
          {timeframes.map(t => (
            <TouchableOpacity
              key={t.value}
              onPress={() => { setTimeframe(t.label); haptic.impact('Light'); }}
              style={[styles.timeBtn, timeframe === t.label && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.timeBtnText, { color: timeframe === t.label ? '#FFF' : colors.textMuted }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Инструменты — 2 кнопки с разным назначением */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>УПРАВЛЕНИЕ КОНТЕНТОМ</Text>
        <View style={styles.toolGrid}>
          <TouchableOpacity
            style={[styles.toolCard, { backgroundColor: colors.primary }]}
            onPress={() => { setCourseModal(true); haptic.impact('Light'); }}
          >
            <Ionicons name="add-circle-outline" size={28} color="#FFF" />
            <Text
              style={styles.toolText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              Создать{'\n'}курс
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolCard, { backgroundColor: '#FF5E5E' }]}
            onPress={() => { setDeleteCourseModal(true); haptic.impact('Light'); }}
          >
            <Ionicons name="trash-outline" size={28} color="#FFF" />
            <Text
              style={styles.toolText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              Удалить{'\n'}курс
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolCard, { backgroundColor: '#2ECC71' }]}
            onPress={() => { setLectureModal(true); haptic.impact('Light'); }}
          >
            <Ionicons name="reader-outline" size={28} color="#FFF" />
            <Text
              style={styles.toolText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              Создать{'\n'}тему
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolCard, { backgroundColor: '#1F2937' }]}
            onPress={() => { setEditCourseModal(true); haptic.impact('Light'); }}
          >
            <Ionicons name="create-outline" size={28} color="#FFF" />
            <Text
              style={styles.toolText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              Редактировать{'\n'}курс
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolCard, { backgroundColor: '#7C3AED' }]}
            onPress={() => { setEditTopicModal(true); haptic.impact('Light'); }}
          >
            <Ionicons name="document-text-outline" size={28} color="#FFF" />
            <Text
              style={styles.toolText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              Редактировать{'\n'}тему
            </Text>
          </TouchableOpacity>
        </View>

        {/* Список пользователей */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 30 }]}>
          ПОЛЬЗОВАТЕЛИ ({users.length})
        </Text>
        <View style={styles.usersList}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            users
              .filter(u =>
                u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(u => renderUserCard(u))
          )}
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          МОДАЛ: СОЗДАНИЕ КУРСА (3 ШАГА)
      ══════════════════════════════════════════════════════ */}
      <Modal visible={courseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.adminModalBox, { backgroundColor: colors.surface }]}>
            <ScrollView
              style={styles.adminModalBody}
              contentContainerStyle={styles.adminModalBodyContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >

              {renderStepper(courseStep)}

              {/* Заголовок шага */}
              <Text style={[styles.modalT, { color: colors.textPrimary }]}>
                {courseStep === 1 && 'Шаг 1: Основная информация'}
                {courseStep === 2 && 'Шаг 2: Оформление'}
                {courseStep === 3 && 'Шаг 3: Предпросмотр'}
              </Text>

              {/* ШАГ 1: Название, описание, ключ */}
              {courseStep === 1 && (
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Название курса *</Text>
                  <TextInput
                    placeholder="Например: Математика"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                    value={newCourseTitle}
                    onChangeText={setNewCourseTitle}
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Описание *</Text>
                  <TextInput
                    placeholder="Краткое описание курса..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background, height: 80, paddingTop: 12, textAlignVertical: 'top' }]}
                    value={newCourseDescription}
                    onChangeText={setNewCourseDescription}
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Ключ курса *</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsCourseKeyDropdownOpen(open => !open)}
                    style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dropdownValue, { color: newCourseKey ? colors.textPrimary : colors.textMuted }]}>
                        {newCourseKey || 'Выберите ключ из списка'}
                      </Text>
                      <Text style={[styles.dropdownHint, { color: colors.textMuted }]}>
                        Используется для связи курса и тем
                      </Text>
                    </View>
                    <Ionicons name={isCourseKeyDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
                  </TouchableOpacity>

                  {isCourseKeyDropdownOpen && (
                    <View style={[styles.dropdownList, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      {COURSE_KEY_OPTIONS.map(option => {
                        const isUsed = availableCourses.some(course => normalizeCourseKey(course.subject_key || '') === option.value);
                        const isSelected = newCourseKey === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            disabled={isUsed}
                            onPress={() => {
                              setNewCourseKey(option.value);
                              setCategoryId(getCategoryIdByKey(option.value));
                              setIsCourseKeyDropdownOpen(false);
                              haptic.impact('Light');
                            }}
                            style={[
                              styles.dropdownOption,
                              {
                                opacity: isUsed ? 0.45 : 1,
                                backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                              }
                            ]}
                          >
                            <Ionicons name={option.icon} size={18} color={isSelected ? colors.primary : colors.textMuted} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.dropdownOptionTitle, { color: colors.textPrimary }]}>{option.label}</Text>
                              <Text style={[styles.dropdownOptionKey, { color: colors.textMuted }]}>{option.value}</Text>
                            </View>
                            {isUsed ? (
                              <Text style={[styles.dropdownUsedText, { color: colors.textMuted }]}>уже есть</Text>
                            ) : isSelected ? (
                              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <Text style={[styles.customKeyLabel, { color: colors.textMuted }]}>
                    Свой ключ, если предмета нет в списке
                  </Text>
                  <TextInput
                    placeholder="Например: algebra_10"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background, marginTop: 6 }]}
                    value={newCourseKey}
                    onChangeText={(t) => setNewCourseKey(normalizeCourseKey(t))}
                    autoCapitalize="none"
                  />
                  <Text style={[styles.dropdownHint, { color: colors.textMuted, marginLeft: 4, marginTop: -8 }]}>
                    Это короткий технический код: по нему приложение связывает курс с лекциями.
                  </Text>
                </View>
              )}

              {/* ШАГ 2: Цвет и иконка */}
              {courseStep === 2 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.stepSubTitle, { color: colors.textPrimary }]}>Раздел курса:</Text>
                  <View style={styles.categoryGrid}>
                    {CATEGORY_OPTIONS.map(category => {
                      const selected = categoryId === category.id;
                      return (
                        <TouchableOpacity
                          key={category.id}
                          onPress={() => {
                            setCategoryId(category.id);
                            haptic.impact('Light');
                          }}
                          style={[
                            styles.categoryChip,
                            {
                              borderColor: selected ? category.color : colors.border,
                              backgroundColor: selected ? category.color + '18' : colors.background,
                            }
                          ]}
                        >
                          <Ionicons name={category.icon} size={17} color={selected ? category.color : colors.textMuted} />
                          <Text
                            numberOfLines={2}
                            adjustsFontSizeToFit
                            minimumFontScale={0.78}
                            style={[
                              styles.categoryChipText,
                              { color: selected ? colors.textPrimary : colors.textMuted }
                            ]}
                          >
                            {category.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.stepSubTitle, { color: colors.textPrimary }]}>Цвет карточки:</Text>
                  <View style={styles.colorPalette}>
                    {['#4A90E2', '#2ECC71', '#E74C3C', '#F39C12', '#9B59B6', '#1ABC9C'].map(c => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => { setCourseColor(c); haptic.impact('Light'); }}
                        style={[styles.colorCircle, { backgroundColor: c, borderWidth: courseColor === c ? 3 : 0, borderColor: '#FFF' }]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.stepSubTitle, { color: colors.textPrimary, marginTop: 15 }]}>Иконка:</Text>
                  <View style={styles.iconPalette}>
                    {['book', 'code-working', 'calculator', 'globe', 'flask', 'analytics', 'school', 'rocket'].map(ico => (
                      <TouchableOpacity
                        key={ico}
                        onPress={() => { setIconName(ico); haptic.impact('Light'); }}
                        style={[styles.iconSelectorBtn, {
                          backgroundColor: iconName === ico ? colors.primary + '20' : 'transparent',
                          borderColor: iconName === ico ? colors.primary : colors.border,
                        }]}
                      >
                        <Ionicons name={ico} size={24} color={iconName === ico ? colors.primary : colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* ШАГ 3: Предпросмотр */}
              {courseStep === 3 && (
                <View style={styles.previewContainer}>
                  <Text style={[styles.stepSubTitle, { color: colors.textMuted, textAlign: 'center', marginBottom: 16 }]}>
                    Так будет выглядеть курс:
                  </Text>
                  <View style={[styles.coursePreviewCard, { backgroundColor: courseColor }]}>
                    <View style={styles.previewIconBox}>
                      <Ionicons name={iconName} size={32} color={courseColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewCardTitle} numberOfLines={1}>{newCourseTitle || 'Название курса'}</Text>
                      <Text style={styles.previewCardDesc} numberOfLines={2}>{newCourseDescription || 'Описание курса...'}</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={28} color="#FFF" style={{ marginLeft: 10 }} />
                  </View>
                  <View style={[styles.previewMeta, { backgroundColor: colors.background }]}>
                    <Text style={[styles.previewMetaText, { color: colors.textMuted }]}>Ключ: <Text style={{ color: colors.textPrimary, fontFamily: 'monospace' }}>{newCourseKey}</Text></Text>
                    <Text style={[styles.previewMetaText, { color: colors.textMuted, marginTop: 4 }]}>
                      Раздел: <Text style={{ color: colors.textPrimary }}>{CATEGORY_OPTIONS.find(category => category.id === categoryId)?.title}</Text>
                    </Text>
                    <Text style={[styles.previewMetaText, { color: colors.textMuted, marginTop: 4 }]}>
                      Статус: <Text style={{ color: publishCourseNow ? '#2ECC71' : '#F39C12' }}>{publishCourseNow ? 'Опубликован' : 'Черновик'}</Text>
                    </Text>
                  </View>

                  <View style={[styles.optionalBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.optionalHeader}>
                      <View style={styles.optionalHeaderText}>
                        <Text style={[styles.optionalTitle, { color: colors.textPrimary }]}>Опубликовать сразу</Text>
                        <Text style={[styles.optionalHint, { color: colors.textMuted }]}>Если выключено, курс сохранится как черновик и не появится в каталоге у студентов.</Text>
                      </View>
                      <Switch
                        value={publishCourseNow}
                        onValueChange={(value) => {
                          setPublishCourseNow(value);
                          haptic.impact('Light');
                        }}
                        trackColor={{ false: colors.border, true: '#2ECC7180' }}
                        thumbColor={publishCourseNow ? '#2ECC71' : '#FFF'}
                      />
                    </View>
                  </View>

                  <View style={[styles.optionalBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.optionalHeader}>
                      <View style={styles.optionalHeaderText}>
                        <Text style={[styles.optionalTitle, { color: colors.textPrimary }]}>Добавить первую лекцию</Text>
                        <Text style={[styles.optionalHint, { color: colors.textMuted }]}>Необязательно. Можно прикрепить файл или ввести Markdown.</Text>
                      </View>
                      <Switch
                        value={attachLectureToCourse}
                        onValueChange={(value) => {
                          setAttachLectureToCourse(value);
                          haptic.impact('Light');
                        }}
                        trackColor={{ false: colors.border, true: colors.primary + '80' }}
                        thumbColor={attachLectureToCourse ? colors.primary : '#FFF'}
                      />
                    </View>

                    {attachLectureToCourse && (
                      <View style={{ marginTop: 16 }}>
                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Название темы *</Text>
                        <TextInput
                          placeholder="Например: Введение в курс"
                          placeholderTextColor={colors.textMuted}
                          style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
                          value={newLectureTitle}
                          onChangeText={setNewLectureTitle}
                        />

                        <View style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <TouchableOpacity
                            onPress={() => setLectureContentMode('text')}
                            style={[styles.modeBtn, lectureContentMode === 'text' && { backgroundColor: colors.primary }]}
                          >
                            <Ionicons name="create-outline" size={16} color={lectureContentMode === 'text' ? '#FFF' : colors.textMuted} />
                            <Text style={[styles.modeBtnText, { color: lectureContentMode === 'text' ? '#FFF' : colors.textMuted }]}>
                              Текст
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setLectureContentMode('file')}
                            style={[styles.modeBtn, lectureContentMode === 'file' && { backgroundColor: colors.primary }]}
                          >
                            <Ionicons name="cloud-upload-outline" size={16} color={lectureContentMode === 'file' ? '#FFF' : colors.textMuted} />
                            <Text style={[styles.modeBtnText, { color: lectureContentMode === 'file' ? '#FFF' : colors.textMuted }]}>
                              Файл
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {lectureContentMode === 'text' ? (
                          <View>
                            <View style={[styles.formatHintBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                              <View style={styles.formatHintHeader}>
                                <Text style={[styles.formatHintTitle, { color: colors.textPrimary }]}>
                                  Формат: {getFormatGuide(categoryId).title}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => openFormatHelp(categoryId)}
                                  style={[styles.infoBtn, { backgroundColor: colors.primary + '15' }]}
                                >
                                  <Ionicons name="information" size={16} color={colors.primary} />
                                </TouchableOpacity>
                              </View>
                              <Text style={[styles.formatHintText, { color: colors.textMuted }]}>
                                {getFormatGuide(categoryId).short}
                              </Text>
                            </View>
                            <TextInput
                              placeholder={getFormatGuide(categoryId).placeholder}
                              placeholderTextColor={colors.textMuted}
                              multiline
                              numberOfLines={10}
                              scrollEnabled
                              style={[styles.mInput, {
                                borderColor: colors.border,
                                color: colors.textPrimary,
                                backgroundColor: colors.surface,
                                minHeight: 240,
                                paddingTop: 12,
                                textAlignVertical: 'top',
                                fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
                              }]}
                              value={newLectureContent}
                              onChangeText={setNewLectureContent}
                            />
                          </View>
                        ) : (
                          <View style={{ alignItems: 'center' }}>
                            <TouchableOpacity
                              onPress={handlePickFile}
                              style={[styles.filePickBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                            >
                              <Ionicons name="cloud-upload" size={30} color={colors.primary} />
                              <Text style={[styles.filePickText, { color: colors.primary }]}>
                                {lectureFileName || 'Выбрать файл лекции'}
                              </Text>
                              <Text style={[styles.filePickHint, { color: colors.textMuted }]}>
                                .txt, .md, .pdf
                              </Text>
                            </TouchableOpacity>
                            {lectureFileName ? (
                              <View style={[styles.fileSelectedBadge, { backgroundColor: '#2ECC7115' }]}>
                                <Ionicons name="checkmark-circle" size={16} color="#2ECC71" />
                                <Text style={{ color: '#2ECC71', fontSize: 13, marginLeft: 6 }}>{lectureFileName}</Text>
                              </View>
                            ) : null}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Кнопки навигации */}
            </ScrollView>

              <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity onPress={() => courseStep === 1 ? resetCourseModal() : setCourseStep(s => s - 1)}>
                  <Text style={{ color: courseStep === 1 ? colors.textMuted : colors.primary, fontWeight: 'bold' }}>
                    {courseStep === 1 ? 'Отмена' : '← Назад'}
                  </Text>
                </TouchableOpacity>
                {courseStep < 3 ? (
                  <TouchableOpacity
                    onPress={() => {
                      const stepError = getCourseStepValidationError();
                      if (stepError) {
                        Alert.alert('Проверьте данные', stepError);
                        return;
                      }
                      setCourseStep(s => s + 1);
                      haptic.impact('Medium');
                    }}
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Далее →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    disabled={isCourseSubmitting}
                    onPress={handleCreateCourse}
                    style={[styles.saveBtn, { backgroundColor: isCourseSubmitting ? colors.border : '#2ECC71' }]}
                  >
                    {isCourseSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
                        {attachLectureToCourse ? '✓ Создать всё' : '✓ Создать курс'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          МОДАЛ: ЗАГРУЗКА ЛЕКЦИИ (3 ШАГА)
      ══════════════════════════════════════════════════════ */}
      <Modal visible={lectureModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.adminModalBox, { backgroundColor: colors.surface }]}>
            <ScrollView
              style={styles.adminModalBody}
              contentContainerStyle={styles.adminModalBodyContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >

              {renderStepper(lectureStep)}

              <Text style={[styles.modalT, { color: colors.textPrimary }]}>
                {lectureStep === 1 && 'Шаг 1: Выберите курс'}
                {lectureStep === 2 && 'Шаг 2: Название темы'}
                {lectureStep === 3 && 'Шаг 3: Содержимое лекции'}
              </Text>

              {/* ШАГ 1: Выбор курса */}
              {lectureStep === 1 && (
                <View>
                  {availableCourses.length === 0 ? (
                    <View style={[styles.emptyCoursesBox, { borderColor: colors.border }]}>
                      <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
                      <Text style={[styles.emptyCoursesText, { color: colors.textMuted }]}>
                        Нет доступных курсов.{'\n'}Сначала создайте курс.
                      </Text>
                    </View>
                  ) : (
                    availableCourses.map(course => (
                      <TouchableOpacity
                        key={course.id}
                        onPress={() => { setSelectedCourse(course); haptic.impact('Light'); }}
                        style={[
                          styles.courseSelectCard,
                          {
                            backgroundColor: selectedCourse?.id === course.id ? colors.primary + '15' : colors.background,
                            borderColor: selectedCourse?.id === course.id ? colors.primary : colors.border,
                          }
                        ]}
                      >
                        <View style={[styles.courseSelectIcon, { backgroundColor: selectedCourse?.id === course.id ? colors.primary : colors.border }]}>
                          <Ionicons name="book" size={16} color="#FFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.courseSelectTitle, { color: colors.textPrimary }]}>{course.title}</Text>
                          <Text style={[styles.courseSelectKey, { color: colors.textMuted }]}>{course.subject_key}</Text>
                        </View>
                        {selectedCourse?.id === course.id && (
                          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* ШАГ 2: Название лекции */}
              {lectureStep === 2 && (
                <View>
                  <View style={[styles.selectedCourseInfo, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                    <Ionicons name="book" size={16} color={colors.primary} />
                    <Text style={[styles.selectedCourseText, { color: colors.primary }]}>
                      Курс: {selectedCourse?.title}
                    </Text>
                  </View>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Название темы *</Text>
                  <TextInput
                    placeholder="Например: Производная функции"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                    value={newLectureTitle}
                    onChangeText={setNewLectureTitle}
                    autoFocus
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 4 }]}>
                    Поддерживается Markdown. Формулы, код или примеры зависят от раздела курса.
                  </Text>
                </View>
              )}

              {/* ШАГ 3: Содержимое */}
              {lectureStep === 3 && (
                <View>
                  <View style={[styles.selectedCourseInfo, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                    <Ionicons name="document-text" size={16} color={colors.primary} />
                    <Text style={[styles.selectedCourseText, { color: colors.primary }]}>
                      {selectedCourse?.title} → {newLectureTitle}
                    </Text>
                  </View>

                  {/* Переключатель режима ввода */}
                  <View style={[styles.modeToggle, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <TouchableOpacity
                      onPress={() => setLectureContentMode('text')}
                      style={[styles.modeBtn, lectureContentMode === 'text' && { backgroundColor: colors.primary }]}
                    >
                      <Ionicons name="create-outline" size={16} color={lectureContentMode === 'text' ? '#FFF' : colors.textMuted} />
                      <Text style={[styles.modeBtnText, { color: lectureContentMode === 'text' ? '#FFF' : colors.textMuted }]}>
                        Текст / Markdown
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setLectureContentMode('file')}
                      style={[styles.modeBtn, lectureContentMode === 'file' && { backgroundColor: colors.primary }]}
                    >
                      <Ionicons name="cloud-upload-outline" size={16} color={lectureContentMode === 'file' ? '#FFF' : colors.textMuted} />
                      <Text style={[styles.modeBtnText, { color: lectureContentMode === 'file' ? '#FFF' : colors.textMuted }]}>
                        Загрузить файл
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {lectureContentMode === 'text' ? (
                    <>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Содержимое лекции *</Text>
                      <View style={[styles.formatHintBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.formatHintHeader}>
                          <Text style={[styles.formatHintTitle, { color: colors.textPrimary }]}>
                            Формат: {getFormatGuide(getCourseCategoryId(selectedCourse)).title}
                          </Text>
                          <TouchableOpacity
                            onPress={() => openFormatHelp(getCourseCategoryId(selectedCourse))}
                            style={[styles.infoBtn, { backgroundColor: colors.primary + '15' }]}
                          >
                            <Ionicons name="information" size={16} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.formatHintText, { color: colors.textMuted }]}>
                          {getFormatGuide(getCourseCategoryId(selectedCourse)).short}
                        </Text>
                      </View>
                      <TextInput
                        placeholder={getFormatGuide(getCourseCategoryId(selectedCourse)).placeholder}
                        placeholderTextColor={colors.textMuted}
                        multiline
                        numberOfLines={12}
                        scrollEnabled
                        style={[styles.mInput, {
                          borderColor: colors.border,
                          color: colors.textPrimary,
                          backgroundColor: colors.background,
                          minHeight: 280,
                          paddingTop: 12,
                          textAlignVertical: 'top',
                          fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
                        }]}
                        value={newLectureContent}
                        onChangeText={setNewLectureContent}
                      />
                    </>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <TouchableOpacity
                        onPress={handlePickFile}
                        style={[styles.filePickBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                      >
                        <Ionicons name="cloud-upload" size={36} color={colors.primary} />
                        <Text style={[styles.filePickText, { color: colors.primary }]}>
                          {lectureFileName || 'Нажмите, чтобы выбрать файл'}
                        </Text>
                        <Text style={[styles.filePickHint, { color: colors.textMuted }]}>
                          Поддерживаются: .txt, .md, .pdf
                        </Text>
                      </TouchableOpacity>
                      {lectureFileName ? (
                        <View style={[styles.fileSelectedBadge, { backgroundColor: '#2ECC7115' }]}>
                          <Ionicons name="checkmark-circle" size={16} color="#2ECC71" />
                          <Text style={{ color: '#2ECC71', fontSize: 13, marginLeft: 6 }}>{lectureFileName}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              )}

              {/* Кнопки навигации */}
            </ScrollView>

              <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity onPress={() => lectureStep === 1 ? resetLectureModal() : setLectureStep(s => s - 1)}>
                  <Text style={{ color: lectureStep === 1 ? colors.textMuted : colors.primary, fontWeight: 'bold' }}>
                    {lectureStep === 1 ? 'Отмена' : '← Назад'}
                  </Text>
                </TouchableOpacity>
                {lectureStep < 3 ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (!canAdvanceLecture()) {
                        Alert.alert('Ошибка', lectureStep === 1 ? 'Выберите курс.' : 'Введите название темы.');
                        return;
                      }
                      setLectureStep(s => s + 1);
                      haptic.impact('Medium');
                    }}
                    style={[styles.saveBtn, { backgroundColor: availableCourses.length === 0 && lectureStep === 1 ? colors.border : colors.primary }]}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Далее →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleCreateLecture}
                    style={[styles.saveBtn, { backgroundColor: '#2ECC71' }]}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✓ Загрузить</Text>
                  </TouchableOpacity>
                )}
              </View>
          </View>
        </View>
      </Modal>

      {/* Edit course modal */}
      <Modal visible={editCourseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.adminModalBox, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Ionicons name="create-outline" size={24} color={colors.primary} />
                <Text style={[styles.modalT, { color: colors.textPrimary, marginBottom: 0, marginLeft: 10 }]}>
                  Редактировать курс
                </Text>
              </View>
              <Text style={[styles.deleteHint, { color: colors.textMuted }]}>
                Выберите курс, проверьте карточку и сохраните как черновик или опубликованную версию.
              </Text>

              <ScrollView
                style={styles.adminModalBody}
                contentContainerStyle={styles.adminModalBodyContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
              {availableCourses.length === 0 ? (
                <View style={[styles.emptyCoursesBox, { borderColor: colors.border }]}>
                  <Ionicons name="albums-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyCoursesText, { color: colors.textMuted }]}>Курсов для редактирования пока нет.</Text>
                </View>
              ) : (
                <ScrollView style={[styles.deleteCourseList, courseToEdit && styles.compactCourseList]} nestedScrollEnabled showsVerticalScrollIndicator>
                  {availableCourses.map(course => {
                    const selected = courseToEdit?.id === course.id;
                    return (
                      <TouchableOpacity
                        key={course.id || course.subject_key}
                        onPress={() => openCourseEditor(course)}
                        style={[
                          styles.courseSelectCard,
                          {
                            backgroundColor: selected ? colors.primary + '15' : colors.background,
                            borderColor: selected ? colors.primary : colors.border,
                          }
                        ]}
                      >
                        <View style={[styles.courseSelectIcon, { backgroundColor: selected ? colors.primary : colors.border }]}>
                          <Ionicons name={course.icon_name || 'book'} size={16} color="#FFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.courseSelectTitle, { color: colors.textPrimary }]}>{course.title}</Text>
                          <Text style={[styles.courseSelectKey, { color: colors.textMuted }]}>
                            {course.subject_key} • {course.is_published === false ? 'черновик' : 'опубликован'}
                          </Text>
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {courseToEdit && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Название курса *</Text>
                  <TextInput
                    value={editCourseTitle}
                    onChangeText={setEditCourseTitle}
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                    placeholderTextColor={colors.textMuted}
                    placeholder="Название курса"
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Описание *</Text>
                  <TextInput
                    value={editCourseDescription}
                    onChangeText={setEditCourseDescription}
                    multiline
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background, height: 90, paddingTop: 12, textAlignVertical: 'top' }]}
                    placeholderTextColor={colors.textMuted}
                    placeholder="Описание курса"
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Ключ *</Text>
                  <TextInput
                    value={editCourseKey}
                    onChangeText={(value) => {
                      const nextKey = normalizeCourseKey(value);
                      setEditCourseKey(nextKey);
                      setEditCategoryId(getCategoryIdByKey(nextKey));
                    }}
                    autoCapitalize="none"
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                    placeholderTextColor={colors.textMuted}
                    placeholder="subject_key"
                  />

                  <Text style={[styles.stepSubTitle, { color: colors.textPrimary }]}>Раздел:</Text>
                  <View style={styles.categoryGrid}>
                    {CATEGORY_OPTIONS.map(category => {
                      const selected = editCategoryId === category.id;
                      return (
                        <TouchableOpacity
                          key={category.id}
                          onPress={() => setEditCategoryId(category.id)}
                          style={[
                            styles.categoryChip,
                            {
                              borderColor: selected ? category.color : colors.border,
                              backgroundColor: selected ? category.color + '18' : colors.background,
                            }
                          ]}
                        >
                          <Ionicons name={category.icon} size={17} color={selected ? category.color : colors.textMuted} />
                          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.categoryChipText, { color: selected ? colors.textPrimary : colors.textMuted }]}>
                            {category.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.colorPalette}>
                    {['#4A90E2', '#2ECC71', '#E74C3C', '#F39C12', '#9B59B6', '#1ABC9C'].map(c => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setEditCourseColor(c)}
                        style={[styles.colorCircle, { backgroundColor: c, borderWidth: editCourseColor === c ? 3 : 0, borderColor: '#FFF' }]}
                      />
                    ))}
                  </View>

                  <View style={styles.iconPalette}>
                    {['book', 'code-working', 'calculator', 'globe', 'flask', 'analytics', 'school', 'rocket'].map(ico => (
                      <TouchableOpacity
                        key={ico}
                        onPress={() => setEditIconName(ico)}
                        style={[styles.iconSelectorBtn, {
                          backgroundColor: editIconName === ico ? colors.primary + '20' : 'transparent',
                          borderColor: editIconName === ico ? colors.primary : colors.border,
                        }]}
                      >
                        <Ionicons name={ico} size={24} color={editIconName === ico ? colors.primary : colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={[styles.optionalBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.optionalHeader}>
                      <View style={styles.optionalHeaderText}>
                        <Text style={[styles.optionalTitle, { color: colors.textPrimary }]}>Статус публикации</Text>
                        <Text style={[styles.optionalHint, { color: colors.textMuted }]}>
                          {editIsPublished ? 'Курс виден студентам в каталоге.' : 'Черновик скрыт из каталога студентов.'}
                        </Text>
                      </View>
                      <Switch
                        value={editIsPublished}
                        onValueChange={setEditIsPublished}
                        trackColor={{ false: colors.border, true: '#2ECC7180' }}
                        thumbColor={editIsPublished ? '#2ECC71' : '#FFF'}
                      />
                    </View>
                  </View>

                  <View style={[styles.coursePreviewCard, { backgroundColor: editCourseColor, marginTop: 14 }]}>
                    <View style={styles.previewIconBox}>
                      <Ionicons name={editIconName} size={32} color={editCourseColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewCardTitle} numberOfLines={1}>{editCourseTitle || 'Название курса'}</Text>
                      <Text style={styles.previewCardDesc} numberOfLines={2}>{editCourseDescription || 'Описание курса...'}</Text>
                    </View>
                    <View style={[styles.publishBadge, { backgroundColor: editIsPublished ? '#2ECC71' : '#F39C12' }]}>
                      <Text style={styles.publishBadgeText}>{editIsPublished ? 'LIVE' : 'DRAFT'}</Text>
                    </View>
                  </View>
                </View>
              )}

              </ScrollView>

              <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity onPress={resetEditCourseModal} style={styles.cancelBtn}>
                  <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!courseToEdit || isCourseUpdating}
                  onPress={handleUpdateCourse}
                  style={[styles.saveBtn, { backgroundColor: !courseToEdit || isCourseUpdating ? colors.border : colors.primary }]}
                >
                  {isCourseUpdating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Сохранить</Text>
                  )}
                </TouchableOpacity>
              </View>
          </View>
        </View>
      </Modal>

      {/* Edit topic modal */}
      <Modal visible={editTopicModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.topicModalBox, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Ionicons name="document-text-outline" size={24} color="#7C3AED" />
                <Text style={[styles.modalT, { color: colors.textPrimary, marginBottom: 0, marginLeft: 10 }]}>
                  Редактировать тему
                </Text>
              </View>
              <Text style={[styles.deleteHint, { color: colors.textMuted }]}>
                Быстрая правка материала, формул, совета и квиза без изменения кода.
              </Text>

              <ScrollView style={styles.topicModalBody} nestedScrollEnabled showsVerticalScrollIndicator>
              {availableTopics.length === 0 ? (
                <View style={[styles.emptyCoursesBox, { borderColor: colors.border }]}>
                  <Ionicons name="reader-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyCoursesText, { color: colors.textMuted }]}>Тем для редактирования пока нет.</Text>
                </View>
              ) : (
                <ScrollView style={styles.topicList} nestedScrollEnabled showsVerticalScrollIndicator>
                  {sortedTopics.map(topic => {
                    const selected = topicToEdit?.id === topic.id;
                    const courseTitle = getCourseTitleBySubject(topic.subject_key);
                    return (
                      <TouchableOpacity
                        key={topic.id}
                        onPress={() => openTopicEditor(topic)}
                        style={[
                          styles.courseSelectCard,
                          {
                            backgroundColor: selected ? '#7C3AED15' : colors.background,
                            borderColor: selected ? '#7C3AED' : colors.border,
                          }
                        ]}
                      >
                        <View style={[styles.courseSelectIcon, { backgroundColor: selected ? '#7C3AED' : colors.border }]}>
                          <Ionicons name="reader" size={16} color="#FFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.courseSelectTitle, { color: colors.textPrimary }]} numberOfLines={1}>{topic.title}</Text>
                          <Text style={[styles.courseSelectKey, { color: colors.textMuted }]} numberOfLines={1}>
                            {courseTitle} • {getTopicQuizInfo(topic)}
                          </Text>
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={22} color="#7C3AED" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {topicToEdit && (
                <View style={{ marginTop: 14 }}>
                  <View style={[styles.topicSummaryCard, { backgroundColor: '#7C3AED12', borderColor: '#7C3AED35' }]}>
                    <View style={[styles.courseSelectIcon, { backgroundColor: '#7C3AED' }]}>
                      <Ionicons name="reader" size={16} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.topicSummaryTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {topicToEdit.title}
                      </Text>
                      <Text style={[styles.topicSummaryMeta, { color: colors.textMuted }]} numberOfLines={2}>
                        {getCourseTitleBySubject(topicToEdit.subject_key)} • ID {topicToEdit.id} • {getTopicQuizInfo(topicToEdit)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Название темы *</Text>
                  <TextInput
                    value={editTopicTitle}
                    onChangeText={setEditTopicTitle}
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholderTextColor={colors.textMuted}
                    placeholder="Название темы"
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Короткое описание</Text>
                  <TextInput
                    value={editTopicDescription}
                    onChangeText={setEditTopicDescription}
                    style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholderTextColor={colors.textMuted}
                    placeholder="Описание темы"
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Материал темы *</Text>
                  <TextInput
                    value={editTopicContent}
                    onChangeText={setEditTopicContent}
                    multiline
                    style={[styles.mInput, styles.topicEditorTextArea, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholderTextColor={colors.textMuted}
                    placeholder="Markdown, [FORMULA]...[/FORMULA], совет и пример"
                  />

                  <View style={[styles.quizEditorBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.modalHeader}>
                      <Ionicons name="help-circle-outline" size={20} color="#7C3AED" />
                      <Text style={[styles.optionalTitle, { color: colors.textPrimary, marginLeft: 8 }]}>Квиз по теме</Text>
                    </View>

                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Вопрос</Text>
                    <TextInput
                      value={editQuizQuestion}
                      onChangeText={setEditQuizQuestion}
                      multiline
                      style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary, minHeight: 70, paddingTop: 12 }]}
                      placeholderTextColor={colors.textMuted}
                      placeholder="Например: Что показывает производная функции в точке?"
                    />

                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Варианты ответа</Text>
                    {[
                      ['A', editQuizOptionA, setEditQuizOptionA],
                      ['B', editQuizOptionB, setEditQuizOptionB],
                      ['C', editQuizOptionC, setEditQuizOptionC],
                      ['D', editQuizOptionD, setEditQuizOptionD],
                    ].map(([label, value, setter]) => (
                      <View key={label} style={styles.quizOptionRow}>
                        <View style={[styles.quizOptionBadge, { backgroundColor: '#7C3AED' }]}>
                          <Text style={styles.quizOptionBadgeText}>{label}</Text>
                        </View>
                        <TextInput
                          value={value}
                          onChangeText={setter}
                          style={[styles.quizOptionInput, { borderColor: colors.border, color: colors.textPrimary }]}
                          placeholderTextColor={colors.textMuted}
                          placeholder={`Вариант ${label}`}
                        />
                      </View>
                    ))}

                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Правильный ответ</Text>
                    <TextInput
                      value={editTopicAnswer}
                      onChangeText={setEditTopicAnswer}
                      style={[styles.mInput, { borderColor: colors.border, color: colors.textPrimary }]}
                      placeholderTextColor={colors.textMuted}
                      placeholder="Должен совпадать с одним из вариантов"
                    />

                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Объяснение при ошибке</Text>
                    <TextInput
                      value={editQuizExplanation}
                      onChangeText={setEditQuizExplanation}
                      multiline
                      style={[styles.mInput, styles.quizExplanationArea, { borderColor: colors.border, color: colors.textPrimary }]}
                      placeholderTextColor={colors.textMuted}
                      placeholder="Почему правильный ответ именно такой?"
                    />
                  </View>

                </View>
              )}
              </ScrollView>

              <View style={styles.modalActions}>
                {topicToEdit ? (
                  <TouchableOpacity
                    disabled={isTopicUpdating || isTopicDeleting}
                    onPress={handleDeleteTopic}
                    style={[styles.deleteTopicBtn, { borderColor: '#FF5E5E', opacity: isTopicUpdating || isTopicDeleting ? 0.5 : 1 }]}
                  >
                    {isTopicDeleting ? (
                      <ActivityIndicator size="small" color="#FF5E5E" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color="#FF5E5E" />
                        <Text style={styles.deleteTopicBtnText}>Удалить</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={resetEditTopicModal} disabled={isTopicUpdating || isTopicDeleting}>
                  <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!topicToEdit || isTopicUpdating || isTopicDeleting}
                  onPress={handleUpdateTopic}
                  style={[styles.saveBtn, { backgroundColor: !topicToEdit || isTopicUpdating || isTopicDeleting ? colors.border : '#7C3AED' }]}
                >
                  {isTopicUpdating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Сохранить</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
        </View>
      </Modal>

      {/* Delete course modal */}
      <Modal visible={deleteCourseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Ionicons name="trash-outline" size={24} color="#FF5E5E" />
                <Text style={[styles.modalT, { color: colors.textPrimary, marginBottom: 0, marginLeft: 10 }]}>
                  Удалить курс
                </Text>
              </View>
              <Text style={[styles.deleteHint, { color: colors.textMuted }]}>
                Выберите курс. На сервере курс удалится вместе с темами, а локальный кэш очистится сразу.
              </Text>

              {availableCourses.length === 0 ? (
                <View style={[styles.emptyCoursesBox, { borderColor: colors.border }]}>
                  <Ionicons name="albums-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyCoursesText, { color: colors.textMuted }]}>Курсов для удаления пока нет.</Text>
                </View>
              ) : (
                <ScrollView style={styles.deleteCourseList} nestedScrollEnabled showsVerticalScrollIndicator>
                  {availableCourses.map(course => (
                    <TouchableOpacity
                      key={course.id || course.subject_key}
                      onPress={() => { setCourseToDelete(course); haptic.impact('Light'); }}
                      style={[
                        styles.courseSelectCard,
                        {
                          backgroundColor: courseToDelete?.id === course.id ? '#FF5E5E15' : colors.background,
                          borderColor: courseToDelete?.id === course.id ? '#FF5E5E' : colors.border,
                        }
                      ]}
                    >
                      <View style={[styles.courseSelectIcon, { backgroundColor: courseToDelete?.id === course.id ? '#FF5E5E' : colors.border }]}>
                        <Ionicons name="book" size={16} color="#FFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.courseSelectTitle, { color: colors.textPrimary }]}>{course.title}</Text>
                        <Text style={[styles.courseSelectKey, { color: colors.textMuted }]}>{course.subject_key}</Text>
                      </View>
                      {courseToDelete?.id === course.id && (
                        <Ionicons name="checkmark-circle" size={22} color="#FF5E5E" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={resetDeleteCourseModal}>
                  <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!courseToDelete || isDeletingCourse}
                  onPress={handleDeleteCourse}
                  style={[styles.saveBtn, { backgroundColor: !courseToDelete || isDeletingCourse ? colors.border : '#FF5E5E' }]}
                >
                  {isDeletingCourse ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Удалить</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Format help modal */}
      <Modal visible={formatHelpModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.helpModalBox, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <Text style={[styles.modalT, { color: colors.textPrimary, marginBottom: 0, marginLeft: 10 }]}>
                Формат: {getFormatGuide(formatHelpCategoryId).title}
              </Text>
            </View>
            <ScrollView style={styles.helpScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.helpLead, { color: colors.textMuted }]}>
                Краткая структура для заполнения темы. Используйте заголовки, примеры и пояснения; дополнительные элементы зависят от раздела курса.
              </Text>
              {getFormatGuide(formatHelpCategoryId).details.map((line, index) => (
                <View key={index} style={[styles.helpLine, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={[styles.helpLineText, { color: colors.textPrimary }]}>{line}</Text>
                </View>
              ))}
              <View style={[styles.helpExample, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.formatHintTitle, { color: colors.textPrimary }]}>Пример заготовки</Text>
                <Text style={[styles.helpExampleText, { color: colors.textMuted }]}>
                  {getFormatGuide(formatHelpCategoryId).placeholder}
                </Text>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setFormatHelpModal(false)}
            >
              <Text style={styles.closeBtnText}>Понятно</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          МОДАЛ: СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ
      ══════════════════════════════════════════════════════ */}
      <Modal visible={statsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, maxHeight: '80%', borderRadius: 32 }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="stats-chart" size={24} color={colors.primary} />
              <Text style={[styles.modalT, { color: colors.textPrimary, marginBottom: 0, marginLeft: 10 }]}>
                {typeof selectedUser === 'string' ? selectedUser : selectedUser?.username}
              </Text>
            </View>
            {typeof selectedUser !== 'string' && selectedUser?.email ? (
              <Text style={[styles.statsUserEmail, { color: colors.textMuted }]}>{selectedUser.email}</Text>
            ) : null}
            <Text style={[styles.statsSub, { color: colors.textMuted }]}>
              Пройдено тем: {userProgress.length}
            </Text>
            <ScrollView style={styles.statsScroll} showsVerticalScrollIndicator={false}>
              {userProgress.length > 0 ? (
                userProgress.map((item, index) => (
                  <View key={index} style={[styles.progressItem, { borderBottomColor: colors.border }]}>
                    <Ionicons name="checkmark-done" size={16} color="#2ECC71" />
                    <View style={styles.progressTextWrap}>
                      <Text style={[styles.progressItemText, { color: colors.textPrimary }]}>
                        {item.topic_title || 'Тема из прогресса'}
                      </Text>
                      <Text style={[styles.progressItemMeta, { color: colors.textMuted }]}>
                        {item.course_title || item.subject_key || `ID темы: ${item.topic_id}`}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нет данных о прогрессе</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setStatsModal(false)}
            >
              <Text style={styles.closeBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    height: 110,
  },
  title: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statItem: { flex: 1, padding: 20, borderRadius: 24, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statLab: { fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  timeframeBox: { flexDirection: 'row', padding: 5, borderRadius: 15, marginBottom: 25, justifyContent: 'space-between' },
  timeBtn: { paddingHorizontal: 12, height: 35, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  timeBtnText: { fontSize: 10, fontWeight: 'bold' },
  sectionTitle: { fontSize: 11, fontWeight: '900', marginBottom: 15, letterSpacing: 2, opacity: 0.5 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toolCard: { width: '48%', minHeight: 144, borderRadius: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 16 },
  toolText: { color: '#FFF', fontWeight: '900', fontSize: 16, lineHeight: 20, marginTop: 10, textAlign: 'center', width: '100%' },
  usersList: { marginBottom: 20 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, borderWidth: 1, marginBottom: 10 },
  avatarMini: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1, marginLeft: 12 },
  uName: { fontSize: 15, fontWeight: 'bold' },
  uEmail: { fontSize: 11, opacity: 0.6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  // Модальные окна
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 18 },
  modalBox: { padding: 24, borderRadius: 28, maxHeight: '88%' },
  adminModalBox: { width: '100%', maxHeight: '88%', padding: 20, borderRadius: 26 },
  adminModalBody: { flexGrow: 0, flexShrink: 1 },
  adminModalBodyContent: { paddingBottom: 4 },
  topicModalBox: { width: '100%', maxHeight: '92%', padding: 20, borderRadius: 26 },
  topicModalBody: { flexGrow: 0, maxHeight: '78%' },
  modalT: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mInput: { minHeight: 55, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 15, marginBottom: 15, fontSize: 15 },
  topicEditorTextArea: { minHeight: 180, paddingTop: 12, textAlignVertical: 'top' },
  quizJsonArea: { minHeight: 120, paddingTop: 12, textAlignVertical: 'top', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, fontSize: 13 },
  quizEditorBlock: { borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 16 },
  quizOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  quizOptionBadge: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quizOptionBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  quizOptionInput: { flex: 1, minHeight: 48, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 12, fontSize: 14 },
  quizExplanationArea: { minHeight: 92, paddingTop: 12, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 12, paddingHorizontal: 0, paddingBottom: 2, borderTopWidth: 1, borderTopColor: 'transparent' },
  deleteTopicBtn: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  deleteTopicBtnText: { color: '#FF5E5E', fontWeight: '900', fontSize: 13 },
  cancelBtn: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { minHeight: 44, minWidth: 108, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  // Stepper
  stepperContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  stepWrapper: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepDotText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  stepLine: { width: 40, height: 3, marginHorizontal: 4 },
  stepSubTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 7, marginLeft: 4 },
  dropdownTrigger: { minHeight: 58, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  dropdownValue: { fontSize: 15, fontWeight: '700' },
  dropdownHint: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  dropdownList: { borderWidth: 1, borderRadius: 16, padding: 8, marginBottom: 10 },
  dropdownOption: { minHeight: 58, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropdownOptionTitle: { fontSize: 14, fontWeight: '700' },
  dropdownOptionKey: { fontSize: 12, marginTop: 2, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  dropdownUsedText: { fontSize: 12, fontWeight: '800' },
  customKeyLabel: { fontSize: 13, fontWeight: '700', marginLeft: 4, marginTop: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  categoryChip: { width: '48%', minHeight: 84, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryChipText: { flex: 1, flexShrink: 1, fontSize: 11, lineHeight: 14, fontWeight: '800' },
  // Курс: цвет/иконка
  colorPalette: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 10 },
  colorCircle: { width: 36, height: 36, borderRadius: 18 },
  iconPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 10 },
  iconSelectorBtn: { width: 50, height: 50, borderRadius: 15, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  // Предпросмотр курса
  previewContainer: { marginBottom: 20 },
  coursePreviewCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24 },
  previewIconBox: { width: 55, height: 55, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  previewCardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  previewCardDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 16 },
  publishBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, marginLeft: 8 },
  publishBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  previewMeta: { marginTop: 12, padding: 10, borderRadius: 12 },
  previewMetaText: { fontSize: 12 },
  optionalBlock: { marginTop: 16, borderWidth: 1, borderRadius: 18, padding: 14 },
  optionalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionalHeaderText: { flex: 1 },
  optionalTitle: { fontSize: 15, fontWeight: '800' },
  optionalHint: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  // Выбор курса для лекции
  courseSelectCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 10 },
  courseSelectIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  courseSelectTitle: { fontSize: 15, fontWeight: '600' },
  courseSelectKey: { fontSize: 12, marginTop: 3 },
  emptyCoursesBox: { alignItems: 'center', padding: 30, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed' },
  emptyCoursesText: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  selectedCourseInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  selectedCourseText: { fontSize: 13, fontWeight: '600', flex: 1 },
  // Режим ввода лекции
  modeToggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  modeBtnText: { fontSize: 12, fontWeight: '600' },
  // Загрузка файла
  filePickBtn: { width: '100%', borderWidth: 2, borderStyle: 'dashed', borderRadius: 20, padding: 30, alignItems: 'center', gap: 10 },
  filePickText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  filePickHint: { fontSize: 12, textAlign: 'center' },
  fileSelectedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 10, borderRadius: 10 },
  formatHintBox: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  formatHintHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  formatHintTitle: { fontSize: 13, fontWeight: '900', marginBottom: 4 },
  formatHintText: { fontSize: 12, lineHeight: 17 },
  infoBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  helpModalBox: { width: '92%', maxWidth: 420, maxHeight: '84%', borderRadius: 28, padding: 22 },
  helpScroll: { maxHeight: 420, marginBottom: 12 },
  helpLead: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  helpLine: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  helpLineText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  helpExample: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 6, marginBottom: 16 },
  helpExampleText: { fontSize: 12, lineHeight: 18, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  deleteHint: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  deleteCourseList: { maxHeight: 260, marginBottom: 8 },
  compactCourseList: { maxHeight: 150 },
  topicList: { maxHeight: 230, marginBottom: 8 },
  topicSummaryCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 16 },
  topicSummaryTitle: { fontSize: 15, fontWeight: '900' },
  topicSummaryMeta: { fontSize: 12, lineHeight: 17, marginTop: 3, fontWeight: '700' },
  // Статистика
  statsUserEmail: { fontSize: 13, fontWeight: '700', marginTop: 4, marginBottom: 10 },
  statsSub: { fontSize: 14, fontWeight: 'bold', marginBottom: 20 },
  statsScroll: { marginBottom: 20 },
  progressItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  progressTextWrap: { flex: 1 },
  progressItemText: { fontSize: 14, fontWeight: '500' },
  progressItemMeta: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  emptyText: { textAlign: 'center', opacity: 0.5, marginVertical: 20 },
  closeBtn: { height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default AdminPanel;
