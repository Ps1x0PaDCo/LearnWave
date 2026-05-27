import React, { useContext, useState, useEffect, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, FlatList, 
  TextInput, Share, Alert, ScrollView, Dimensions, StatusBar 
} from 'react-native';
import { AuthContext, CoursesContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db'; 
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const MyCoursesScreen = ({ navigation }) => {
  const { completedCourses, setCompletedCourses } = useContext(CoursesContext);
  const { 
    user, 
    isDarkMode, 
    getCompletedTopics,
    toggleBookmark
  } = useContext(AuthContext);

  const nickname = user?.username;
  const colors = getThemeColors(isDarkMode);

  const [allTopics, setAllTopics] = useState([]);
  const [bookmarkedTopics, setBookmarkedTopics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // 1. Загрузка данных
  useEffect(() => {
    if (nickname) {
      const completed = getCompletedTopics(nickname) || [];
      setCompletedCourses(completed);

      try {
        const bookmarks = db.getAllSync('SELECT topic_title FROM bookmarks WHERE username = ?', [nickname]);
        setBookmarkedTopics(bookmarks.map(b => b.topic_title));

        const topicsData = db.getAllSync(`
          SELECT t.title as topic, c.title as courseTitle 
          FROM topics t
          JOIN courses c ON t.subject_key = c.subject_key
        `);
        setAllTopics(topicsData || []);
      } catch (e) {
        console.error("Ошибка аналитики:", e);
      }
    }
  }, [nickname]);

  // 2. Логика фильтрации
  const filteredTopics = useMemo(() => {
    return allTopics.filter(item => {
      const matchesSearch = item.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isFinished = (completedCourses || []).includes(item.topic);
      const isSaved = (bookmarkedTopics || []).includes(item.topic);

      if (activeFilter === 'completed') return matchesSearch && isFinished;
      if (activeFilter === 'not_completed') return matchesSearch && !isFinished;
      if (activeFilter === 'bookmarks') return matchesSearch && isSaved;
      return matchesSearch;
    });
  }, [allTopics, searchQuery, activeFilter, completedCourses, bookmarkedTopics]);

  const totalCount = allTopics.length;
  const completedCount = (completedCourses || []).length;
  const totalPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleShare = async () => {
    const message = `📚 LearnWave: Мой прогресс!\nСтудент: ${nickname}\nИзучено: ${completedCount}/${totalCount} (${totalPercent}%)\nУчись вместе со мной! 🚀`;
    try { 
      await Share.share({ message }); 
    } catch (error) { 
      Alert.alert('Ошибка', 'Не удалось отправить отчет'); 
    }
  };

  const onRemoveBookmark = (topicTitle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Удалить?', 'Убрать тему из сохраненных?', [
      { text: 'Отмена', style: 'cancel' },
      { 
        text: 'Удалить', 
        style: 'destructive', 
        onPress: () => {
          toggleBookmark(nickname, topicTitle, true);
          setBookmarkedTopics(prev => prev.filter(t => t !== topicTitle));
        } 
      }
    ]);
  };

  const renderTopicCard = ({ item }) => {
    const isFinished = (completedCourses || []).includes(item.topic);
    const isSaved = (bookmarkedTopics || []).includes(item.topic);

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onLongPress={() => isSaved && onRemoveBookmark(item.topic)}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          <Text style={[styles.courseTag, { color: colors.primary }]}>{item.courseTitle.toUpperCase()}</Text>
          <Text style={[styles.topicName, { color: colors.textPrimary }]}>{item.topic}</Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: isFinished ? '#2ECC7120' : colors.background }]}>
          <Text style={[styles.statusText, { color: isFinished ? '#27AE60' : colors.textMuted }]}>
            {isFinished ? 'ИЗУЧЕНО' : 'В ПРОЦЕССЕ'}
          </Text>
        </View>
        {isSaved && (
          <Ionicons name="bookmark" size={18} color={colors.primary} style={styles.bookmarkIcon} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Моё обучение</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareIcon}>
          <Ionicons name="share-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTopics}
        renderItem={renderTopicCard}
        keyExtractor={(item) => item.topic}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listPadding}
        ListHeaderComponent={() => (
          <View style={styles.topSection}>
            <View style={[styles.analyticsCard, { backgroundColor: colors.primary }]}>
              <View style={styles.analyticsText}>
                <Text style={styles.analyticsTitle}>Общий прогресс</Text>
                <Text style={styles.analyticsPercent}>{totalPercent}%</Text>
                <View style={styles.miniProgressContainer}>
                  <View style={[styles.miniProgressFill, { width: `${totalPercent}%` }]} />
                </View>
              </View>
              <View style={styles.analyticsIconCircle}>
                <Ionicons name="trophy" size={36} color={colors.primary} />
              </View>
            </View>

            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.textMuted} />
              <TextInput 
                placeholder="Найти тему..." 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingRight: 40 }}>
              {[
                { id: 'all', label: 'Все темы', icon: 'grid' },
                { id: 'completed', label: 'Изучено', icon: 'checkmark-circle' },
                { id: 'not_completed', label: 'В процессе', icon: 'time' },
                { id: 'bookmarks', label: 'Избранное', icon: 'bookmark' }
              ].map(f => (
                <TouchableOpacity 
                  key={f.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveFilter(f.id); }}
                  style={[styles.filterPill, { 
                    backgroundColor: activeFilter === f.id ? colors.primary : colors.surface,
                    borderColor: activeFilter === f.id ? colors.primary : colors.border
                  }]}
                >
                  <Ionicons name={f.icon} size={14} color={activeFilter === f.id ? '#FFF' : colors.textMuted} />
                  <Text style={[styles.filterLabel, { color: activeFilter === f.id ? '#FFF' : colors.textMuted }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="file-tray-outline" size={60} color={colors.border} />
            <Text style={{ color: colors.textMuted, marginTop: 15, fontWeight: '600' }}>Ничего не нашли...</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  backButton: { width: 45, height: 45, justifyContent: 'center' },
  shareIcon: { width: 45, height: 45, justifyContent: 'center', alignItems: 'flex-end' },
  listPadding: { paddingBottom: 40 },
  topSection: { paddingHorizontal: 20 },
  analyticsCard: { height: 130, borderRadius: 32, padding: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 25, elevation: 8 },
  analyticsText: { flex: 1 },
  analyticsTitle: { color: '#FFF', fontSize: 14, fontWeight: '600', opacity: 0.9 },
  analyticsPercent: { color: '#FFF', fontSize: 32, fontWeight: '900', marginVertical: 4 },
  miniProgressContainer: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, marginTop: 10 },
  miniProgressFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 3 },
  analyticsIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 55, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 15, marginBottom: 20 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  filterRow: { flexDirection: 'row', marginBottom: 25 },
  filterPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  filterLabel: { marginLeft: 8, fontSize: 13, fontWeight: 'bold' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, elevation: 3 },
  cardContent: { flex: 1 },
  courseTag: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  topicName: { fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 9, fontWeight: '900' },
  bookmarkIcon: { marginLeft: 10 },
  emptyBox: { alignItems: 'center', marginTop: 80 }
});

export default MyCoursesScreen;
