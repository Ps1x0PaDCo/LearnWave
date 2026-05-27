import React, { useContext, useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  Animated, StatusBar, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext'; // ИСПРАВЛЕНО
import { getThemeColors } from '../styles/colors';
import { db } from '../services/db'; 
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const SUBJECT_DETAILS = {
  Math: { title: 'Математика', desc: 'Алгебра, геометрия и функции', icon: 'analytics-outline', color: '#4A90E2' },
  Informatics: { title: 'IT технологии', desc: 'Алгоритмы и программирование', icon: 'code-working-outline', color: '#9B59B6' },
  Russian: { title: 'Русский язык', desc: 'Орфография и культура речи', icon: 'text-outline', color: '#2ECC71' },
  Literature: { title: 'Литература', desc: 'Анализ текстов и классика', icon: 'library-outline', color: '#E67E22' },
  Physics: { title: 'Физика', desc: 'Законы природы и механика', icon: 'flash-outline', color: '#F1C40F' },
  Biology: { title: 'Биология', desc: 'Мир живых организмов', icon: 'leaf-outline', color: '#FF5E5E' },
};

const SubjectSelectionScreen = ({ route, navigation }) => {
  const { subjectKey } = route.params || { subjectKey: 'Math' };
  const { isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [topicCount, setTopicCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const current = SUBJECT_DETAILS[subjectKey] || { 
    title: subjectKey,
    desc: 'Изучение основ направления', 
    icon: 'school-outline', 
    color: colors.primary 
  };

  useEffect(() => {
    // Анимация «всплытия» карточки
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    
    const fetchStats = () => {
      try {
        const result = db.getFirstSync('SELECT COUNT(*) as count FROM topics WHERE subject_key = ?', [subjectKey]);
        setTopicCount(result?.count || 0);
      } catch (e) { 
        setTopicCount(0); 
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [subjectKey]);

  const handleOpenTopics = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('TopicSelection', { 
      subject: { subject_key: subjectKey, title: current.title } 
    });
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{current.title}</Text>
          <View style={{ width: 45 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.mainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Animated.View style={[styles.iconCircle, { backgroundColor: current.color + '15', transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name={current.icon} size={70} color={current.color} />
            </Animated.View>
            
            <Text style={[styles.subjectLabel, { color: current.color }]}>ОБУЧЕНИЕ ДОСТУПНО</Text>
            <Text style={[styles.cardDesc, { color: colors.textPrimary }]}>{current.desc}</Text>
            
            <View style={[styles.infoBadge, { backgroundColor: colors.background }]}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="layers-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.infoBadgeText, { color: colors.textMuted }]}>
                     В архиве: {topicCount} тем
                  </Text>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: current.color }]}
            activeOpacity={0.8}
            onPress={handleOpenTopics}
          >
            <Text style={styles.buttonText}>Начать изучение</Text>
            <View style={styles.btnIconCircle}>
               <Ionicons name="arrow-forward" size={18} color={current.color} />
            </View>
          </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  mainCard: { borderRadius: 35, padding: 40, alignItems: 'center', borderWidth: 1, elevation: 5, shadowOpacity: 0.05, shadowRadius: 15, marginBottom: 30 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  subjectLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  cardDesc: { fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 30, marginBottom: 25 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  infoBadgeText: { fontSize: 13, fontWeight: 'bold', marginLeft: 8 },
  primaryButton: { height: 65, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, elevation: 4 },
  btnIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' }
});

export default SubjectSelectionScreen;
