import React, { useContext, useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, TextInput, FlatList, 
  StyleSheet, StatusBar, Platform 
} from 'react-native';
import { AuthContext} from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db'; 
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const TopicSelectionScreen = ({ route, navigation }) => {
  const { subject } = route.params || {};
  const subjectKey = subject?.subject_key || 'Math';
  
  const { isDarkMode } = useContext(AuthContext);
  const { completedCourses } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [subjectTopics, setSubjectTopics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchTopics = () => {
      try {
        // Используем LOWER для игнорирования регистра в кириллице
        const query = `
          SELECT * FROM topics 
          WHERE subject_key = ? 
          AND (LOWER(title) LIKE LOWER(?) OR LOWER(content) LIKE LOWER(?))
        `;
        const searchParam = `%${searchQuery.trim()}%`;
        const data = db.getAllSync(query, [subjectKey, searchParam, searchParam]);
        
        if (isMounted) {
          setSubjectTopics(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (isMounted) setSubjectTopics([]);
      }
    };
    fetchTopics();
    return () => { isMounted = false; };
  }, [subjectKey, searchQuery]); // searchQuery в зависимостях — это важно!

  const handleTopicPress = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Content', { topic: item });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 60 }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{subject?.title || 'Темы курса'}</Text>
        <View style={{ width: 45 }} />
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput 
          placeholder="Поиск по темам..." 
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]} 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
        />
      </View>

      <FlatList
        data={subjectTopics}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isDone = (completedCourses || []).includes(item.title);
          return (
            <TouchableOpacity 
              style={[styles.topicCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleTopicPress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: isDone ? '#34C75915' : colors.primary + '10' }]}>
                <Ionicons 
                  name={isDone ? "checkmark-done" : "document-text-outline"} 
                  size={24} 
                  color={isDone ? "#34C759" : colors.primary} 
                />
              </View>
              
              <View style={styles.topicInfo}>
                <Text style={[styles.topicTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.topicDesc, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.description || 'Нажмите, чтобы начать изучение'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={50} color={colors.border} />
            <Text style={{ color: colors.textMuted, marginTop: 10 }}>Темы не найдены</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 2, shadowOpacity: 0.05 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 15, height: 55, borderRadius: 18, borderWidth: 1.5, marginBottom: 20 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  topicCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, borderWidth: 1, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  topicInfo: { flex: 1 },
  topicTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  topicDesc: { fontSize: 12, fontWeight: '500' },
  empty: { alignItems: 'center', marginTop: 100 }
});

export default TopicSelectionScreen;
