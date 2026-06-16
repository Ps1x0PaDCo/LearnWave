import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import { db } from '../services/db';
import { getThemeColors } from '../styles/colors';

const haptic = {
  impact: (style) => {
    if (Platform.OS !== 'web') {
      const H = require('expo-haptics');
      H.impactAsync(style);
    }
  },
};

const BUILT_IN_TERMS = [
  {
    id: 'math-derivative',
    term: "Производная: f'(x)",
    definition: "Производная показывает скорость изменения функции. Базовая запись: f'(x)=lim при h->0 от (f(x+h)-f(x))/h.",
    subject_key: 'math',
    formulaKey: 'derivative',
  },
  {
    id: 'math-discriminant',
    term: 'Дискриминант: D=b²-4ac',
    definition: 'Используется для квадратного уравнения ax²+bx+c=0. Если D>0 - два корня, D=0 - один корень, D<0 - действительных корней нет.',
    subject_key: 'math',
    formulaKey: 'discriminant',
  },
  {
    id: 'math-trig',
    term: 'Тригонометрия: sin²α+cos²α=1',
    definition: 'Основное тождество связывает синус и косинус одного угла. Часто помогает упрощать выражения и находить неизвестную величину.',
    subject_key: 'math',
    formulaKey: 'trig',
  },
  {
    id: 'physics-ohm',
    term: 'Закон Ома: I=U/R',
    definition: 'Сила тока равна напряжению, делённому на сопротивление. Чем больше сопротивление при том же напряжении, тем меньше ток.',
    subject_key: 'physics',
    formulaKey: 'ohm',
  },
  {
    id: 'physics-newton',
    term: 'Второй закон Ньютона: F=m·a',
    definition: 'Сила равна произведению массы на ускорение. Формула объясняет, почему тело с большей массой труднее разогнать.',
    subject_key: 'physics',
    formulaKey: 'newton',
  },
  {
    id: 'physics-energy',
    term: 'Кинетическая энергия: Ek=m·v²/2',
    definition: 'Энергия движения зависит от массы и квадрата скорости. Если скорость увеличить в 2 раза, энергия возрастёт в 4 раза.',
    subject_key: 'physics',
    formulaKey: 'energy',
  },
  {
    id: 'python-variable',
    term: 'Переменная',
    definition: 'Имя, которое хранит значение в программе. В Python тип определяется автоматически: число, строка, логическое значение и другие.',
    subject_key: 'python_dev',
  },
  {
    id: 'python-if',
    term: 'Условие if/else',
    definition: 'Конструкция, которая позволяет программе выбирать разные действия в зависимости от истинности условия.',
    subject_key: 'python_dev',
  },
  {
    id: 'python-for',
    term: 'Цикл for',
    definition: 'Используется для повторения действия для каждого элемента последовательности: списка, строки или диапазона чисел.',
    subject_key: 'python_dev',
  },
];

const TABS = [
  { key: 'all', title: 'Все' },
  { key: 'math', title: 'Математика' },
  { key: 'physics', title: 'Физика' },
  { key: 'python_dev', title: 'Python' },
];

const normalizeFormulaText = (value = '') => String(value)
  .toLowerCase()
  .replace(/ё/g, 'е')
  .replace(/²/g, '^2')
  .replace(/·/g, '*')
  .replace(/\s+/g, '');

const getFormulaKey = (item) => {
  const source = `${item.term || ''} ${item.definition || ''}`;
  const normalized = normalizeFormulaText(source);
  const lower = source.toLowerCase().replace(/ё/g, 'е');

  if (lower.includes('производн') || normalized.includes("f'(x)=lim")) return 'derivative';
  if (lower.includes('дискриминант') || normalized.includes('d=b^2-4ac')) return 'discriminant';
  if (lower.includes('тригонометр') || normalized.includes('sin^2') || normalized.includes('cos^2')) return 'trig';
  if (lower.includes('закон ома') || normalized.includes('i=u/r')) return 'ohm';
  if (lower.includes('закон ньютона') || normalized.includes('f=m*a')) return 'newton';
  if (lower.includes('кинетическ') || normalized.includes('ek=m*v^2/2') || normalized.includes('e_k=m*v^2/2')) return 'energy';
  return null;
};

const enrichTerm = (item) => ({
  ...item,
  formulaKey: item.formulaKey || getFormulaKey(item),
});

const normalizeKey = (item) => {
  const formulaKey = item.formulaKey || getFormulaKey(item);
  if (formulaKey) {
    return `${item.subject_key}:formula:${formulaKey}`.toLowerCase();
  }
  return `${item.subject_key}:${item.term}`.toLowerCase();
};

const MathText = ({ children, color, size = 21, style }) => (
  <Text style={[styles.formulaText, { color, fontSize: size }, style]}>{children}</Text>
);

const Sup = ({ children, color }) => (
  <Text style={[styles.formulaSup, { color }]}>{children}</Text>
);

const Sub = ({ children, color }) => (
  <Text style={[styles.formulaSub, { color }]}>{children}</Text>
);

const PowerTerm = ({ base, power, suffix = '', color }) => (
  <View style={styles.inlineFormula}>
    <MathText color={color}>{base}</MathText>
    <Sup color={color}>{power}</Sup>
    {suffix ? <MathText color={color}>{suffix}</MathText> : null}
  </View>
);

const Fraction = ({ numerator, denominator, color, width = 80 }) => (
  <View style={styles.fraction}>
    <View style={[styles.fractionPart, { minWidth: width }]}>{numerator}</View>
    <View style={[styles.fractionLine, { width, backgroundColor: color }]} />
    <View style={[styles.fractionPart, { minWidth: width }]}>{denominator}</View>
  </View>
);

const FormulaView = ({ formulaKey, colors }) => {
  if (!formulaKey) return null;

  const color = colors.primary;
  const boxStyle = [
    styles.formulaBox,
    {
      backgroundColor: colors.primary + '10',
      borderColor: colors.primary + '35',
    },
  ];

  const renderFormula = () => {
    switch (formulaKey) {
      case 'derivative':
        return (
          <View style={styles.formulaRow}>
            <MathText color={color} style={{ marginRight: 8 }}>f'(x) =</MathText>
            <View style={styles.limitBlock}>
              <MathText color={color} size={20}>lim</MathText>
              <Text style={[styles.limitSub, { color }]}>h→0</Text>
            </View>
            <Fraction
              color={color}
              width={136}
              numerator={<MathText color={color} size={17}>f(x + h) - f(x)</MathText>}
              denominator={<MathText color={color} size={17}>h</MathText>}
            />
          </View>
        );
      case 'discriminant':
        return (
          <View style={styles.formulaRow}>
            <MathText color={color}>D = </MathText>
            <PowerTerm base="b" power="2" color={color} />
            <MathText color={color}> - 4ac</MathText>
          </View>
        );
      case 'trig':
        return (
          <View style={styles.formulaRow}>
            <PowerTerm base="sin" power="2" suffix="α" color={color} />
            <MathText color={color}> + </MathText>
            <PowerTerm base="cos" power="2" suffix="α" color={color} />
            <MathText color={color}> = 1</MathText>
          </View>
        );
      case 'ohm':
        return (
          <View style={styles.formulaRow}>
            <MathText color={color} style={{ marginRight: 10 }}>I =</MathText>
            <Fraction
              color={color}
              width={44}
              numerator={<MathText color={color}>U</MathText>}
              denominator={<MathText color={color}>R</MathText>}
            />
          </View>
        );
      case 'newton':
        return (
          <View style={styles.formulaRow}>
            <MathText color={color}>F = m · a</MathText>
          </View>
        );
      case 'energy':
        return (
          <View style={styles.formulaRow}>
            <View style={[styles.inlineFormula, { marginRight: 10 }]}>
              <MathText color={color}>E</MathText>
              <Sub color={color}>k</Sub>
              <MathText color={color}> =</MathText>
            </View>
            <Fraction
              color={color}
              width={72}
              numerator={(
                <View style={styles.inlineFormula}>
                  <MathText color={color}>m · v</MathText>
                  <Sup color={color}>2</Sup>
                </View>
              )}
              denominator={<MathText color={color}>2</MathText>}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return <View style={boxStyle}>{renderFormula()}</View>;
};

const ReferenceScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGlossary = () => {
      setLoading(true);
      try {
        const result = activeTab === 'all'
          ? db.getAllSync('SELECT * FROM glossary ORDER BY term ASC')
          : db.getAllSync('SELECT * FROM glossary WHERE subject_key = ? ORDER BY term ASC', [activeTab]);
        setTerms(result || []);
      } catch (e) {
        setTerms([]);
      } finally {
        setLoading(false);
      }
    };

    loadGlossary();
  }, [activeTab]);

  const mergedTerms = useMemo(() => {
    const source = activeTab === 'all'
      ? BUILT_IN_TERMS
      : BUILT_IN_TERMS.filter(item => item.subject_key === activeTab);
    const map = new Map();
    [...source, ...terms].forEach(item => {
      const enriched = enrichTerm(item);
      const key = normalizeKey(enriched);
      const existing = map.get(key);
      map.set(key, existing ? { ...existing, ...enriched, formulaKey: enriched.formulaKey || existing.formulaKey } : enriched);
    });
    return Array.from(map.values()).sort((a, b) => a.term.localeCompare(b.term, 'ru'));
  }, [activeTab, terms]);

  const filteredTerms = mergedTerms.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return item.term.toLowerCase().includes(query) || item.definition.toLowerCase().includes(query);
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Справочник</Text>
        <View style={{ width: 45 }} />
      </View>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Формулы и короткие определения доступны даже без подключения к серверу.
      </Text>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Поиск формул и терминов..."
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

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  { backgroundColor: isActive ? colors.primary : colors.surface, borderColor: colors.border },
                ]}
                onPress={() => {
                  haptic.impact('medium');
                  setActiveTab(tab.key);
                }}
              >
                <Text style={[styles.tabText, { color: isActive ? '#FFF' : colors.textPrimary }]}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTerms}
          keyExtractor={(item, idx) => item.id?.toString() || `${item.term}-${idx}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={50} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Ничего не найдено</Text>
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
              <FormulaView formulaKey={item.formulaKey} colors={colors} />
              <Text style={[styles.termDefinition, { color: colors.textMuted }]}>{item.definition}</Text>
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
  headerTitle: { fontSize: 22, fontWeight: '900' },
  subtitle: { paddingHorizontal: 22, marginBottom: 14, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 2 },
  searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
  searchBox: { height: 50, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  tabsContainer: { height: 50, marginBottom: 15 },
  tabsScroll: { paddingHorizontal: 20, alignItems: 'center' },
  tabButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 1, marginRight: 10, elevation: 1 },
  tabText: { fontSize: 14, fontWeight: 'bold' },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  termCard: { padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8 },
  termHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  termTitle: { fontSize: 17, fontWeight: '900', flex: 1, marginRight: 10 },
  termDefinition: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  formulaBox: { marginBottom: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', minHeight: 74 },
  formulaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  inlineFormula: { flexDirection: 'row', alignItems: 'flex-start' },
  formulaText: { fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif', letterSpacing: 0 },
  formulaSup: { fontSize: 12, lineHeight: 16, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif', marginTop: -8, marginLeft: 1 },
  formulaSub: { fontSize: 12, lineHeight: 16, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif', marginTop: 10, marginLeft: 1 },
  fraction: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  fractionPart: { alignItems: 'center', paddingHorizontal: 4 },
  fractionLine: { height: 2, borderRadius: 1, marginVertical: 4 },
  limitBlock: { alignItems: 'center', marginRight: 8 },
  limitSub: { fontSize: 10, lineHeight: 12, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif', marginTop: -2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 15, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});

export default ReferenceScreen;
