import React, { useContext, useEffect, useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, StatusBar, Platform, ActivityIndicator 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db'; 
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const ReferenceScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [activeTab, setActiveTab] = useState('terms'); // 'terms' или 'formulas'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Данные из БД
  const [glossary, setGlossary] = useState([]);
  const [formulas, setFormulas] = useState([]);

  useEffect(() => {
    const loadData = () => {
      setLoading(true);
      try {
        // Читаем термины из локальной SQLite (теперь они будут чистыми после синхронизации)
        const termsData = db.getAllSync('SELECT * FROM glossary ORDER BY term ASC', []);
        setGlossary(termsData || []);

        // Загружаем формулы, аккуратно проверяя наличие контента
        const topics = db.getAllSync('SELECT title, content FROM topics', []);
        let extractedFormulas = [];
        topics.forEach(t => {
          if (!t || !t.content) return;
          
          const matches = t.content.match(/\[FORMULA\](.*?)\[\/FORMULA\]/g);
          if (matches) {
            matches.forEach((m, i) => {
              extractedFormulas.push({
                id: `${t.title || 'formula'}-${i}`,
                topic: t.title || 'Справочник',
                value: m.replace(/\[\/?FORMULA\]/g, '').trim()
              });
            });
          }
        });
        setFormulas(extractedFormulas);
      } catch (e) {
        console.error('❌ Ошибка загрузки справочника:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);


  // Фильтрация данных на лету
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (activeTab === 'terms') {
      return glossary.filter(item => 
        item.term.toLowerCase().includes(query) || 
        item.definition.toLowerCase().includes(query)
      );
    } else {
      return formulas.filter(item => 
        item.value.toLowerCase().includes(query) || 
        item.topic.toLowerCase().includes(query)
      );
    }
  }, [searchQuery, activeTab, glossary, formulas]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>База знаний</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ПОИСК */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput 
          placeholder="Поиск определения или формулы..." 
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* ПЕРЕКЛЮЧАТЕЛЬ ТАБОВ */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          onPress={() => { setActiveTab('terms'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.tab, activeTab === 'terms' && { borderBottomColor: colors.primary }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'terms' ? colors.primary : colors.textMuted }]}>ОПРЕДЕЛЕНИЯ</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => { setActiveTab('formulas'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.tab, activeTab === 'formulas' && { borderBottomColor: colors.primary }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'formulas' ? colors.primary : colors.textMuted }]}>ФОРМУЛЫ</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => item.id?.toString() || item.term || index.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {activeTab === 'terms' ? (
                <>
                  <Text style={[styles.cardTerm, { color: colors.primary }]}>{item.term}</Text>
                  <Text style={[styles.cardDef, { color: colors.textPrimary }]}>{item.definition}</Text>
                  <View style={styles.tag}><Text style={styles.tagText}>{item.subject_key}</Text></View>
                </>
              ) : (
                <>
                  <View style={styles.formulaBox}>
                    <Text style={[styles.formulaText, { color: colors.textPrimary }]}>{item.value}</Text>
                  </View>
                  <Text style={[styles.sourceText, { color: colors.textMuted }]}>Источник: {item.topic}</Text>
                </>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Ничего не найдено</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', margin: 20, paddingHorizontal: 15, height: 50, borderRadius: 15, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  list: { padding: 20, paddingBottom: 40 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 15, elevation: 2 },
  cardTerm: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  cardDef: { fontSize: 14, lineHeight: 22 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', marginTop: 12 },
  tagText: { fontSize: 10, fontWeight: 'bold', opacity: 0.5 },
  formulaBox: { padding: 15, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.02)', alignItems: 'center', marginBottom: 10 },
  formulaText: { fontSize: 20, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  sourceText: { fontSize: 11, fontStyle: 'italic', textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 50 }
});

export default ReferenceScreen;
