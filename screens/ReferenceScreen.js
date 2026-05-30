import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, TextInput, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';



const ReferenceScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  // Список вкладок (ключи приведены к нижнему регистру под бэкенд PostgreSQL)
  const TABS = [
    { key: 'all', title: 'Все' },
    { key: 'math', title: 'Математика' },
    { key: 'physics', title: 'Физика' },
    { key: 'programming', title: 'IT / Код' },
    { key: 'web_dev', title: 'Веб' },
  ];

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Загрузка данных глоссария из локальной SQLite
  useEffect(() => {
    const loadGlossary = () => {
      setLoading(true);
      try {
        let result;
        if (activeTab === 'all') {
          result = db.getAllSync('SELECT * FROM glossary ORDER BY term ASC');
        } else {
          result = db.getAllSync('SELECT * FROM glossary WHERE subject_key = ? ORDER BY term ASC', [activeTab]);
        }
        setTerms(result || []);
      } catch (e) {
        console.log('❌ Ошибка чтения глоссария из SQLite:', e.message);
        setTerms([]);
      } finally {
        setLoading(false);
      }
    };

    loadGlossary();
  }, [activeTab]);

  // Фильтрация списка через поисковую строку
  const filteredTerms = terms.filter(item =>
    item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTabPress = (tabKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tabKey);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>База знаний</Text>
        <View style={{ width: 45 }} />
      </View>

      {/* ПОИСКОВАЯ СТРОКА */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Поиск терминов, формул..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* СЕГМЕНТ ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  { backgroundColor: isActive ? colors.primary : colors.surface, borderColor: colors.border }
                ]}
                onPress={() => handleTabPress(tab.key)}
              >
                <Text style={[styles.tabText, { color: isActive ? '#FFF' : colors.textPrimary }]}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* СПИСОК ТЕРМИНОВ */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTerms}
          keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={50} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Справочник пуст или ничего не найдено
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.termCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.termHeader}>
                <Text style={[styles.termTitle, { color: colors.textPrimary }]}>{item.term}</Text>
                <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {(item.subject_key || 'общее').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={[styles.termDefinition, { color: colors.textMuted }]}>
                {item.definition}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 2 },
  searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
  searchBox: { height: 50, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  tabsContainer: { height: 50, marginBottom: 15 },
  tabsScroll: { paddingHorizontal: 20, alignItems: 'center' },
  tabButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1, marginRight: 10, elevation: 1 },
  tabText: { fontSize: 14, fontWeight: 'bold' },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  termCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8 },
  termHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  termTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 10 },
  termDefinition: { fontSize: 14, lineHeight: 22 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 15, fontSize: 14, fontWeight: '600', textAlign: 'center' }
});

export default ReferenceScreen;
