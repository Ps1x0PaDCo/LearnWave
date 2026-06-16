import React, { useState, useContext, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  useWindowDimensions, StatusBar, Platform, LayoutAnimation 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Line, Path, Circle, G, Text as SvgText } from 'react-native-svg';

// ─── Haptics: безопасная обёртка (не падает на вебе) ─────────────────────────
const haptic = {
  impact: (style) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.impactAsync(style); } },
  notification: (type) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.notificationAsync(type); } },
};

const LabScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const GRID_SIZE = width - 40;
  const STEP = GRID_SIZE / 10;
  const { isDarkMode } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  // Состояния основной функции
  const [type, setType] = useState('line'); // 'line', 'parabola', 'physics'
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);

  // Состояния "Призрачного" графика для сравнения
  const [ghost, setGhost] = useState(null);

  // Хелперы координат
  const mapX = (x) => (GRID_SIZE / 2) + (x * STEP);
  const mapY = (y) => (GRID_SIZE / 2) - (y * STEP);

  // --- МАТЕМАТИЧЕСКИЙ АНАЛИЗ ---
  const analysis = useMemo(() => {
    if (type === 'line') {
      const root = a !== 0 ? -b / a : null;
      return { rootX: root, yIntercept: b };
    }
    
    // Для параболы: ax² + bx + c
    const D = b * b - 4 * a * c;
    const vertexX = -b / (2 * a);
    const vertexY = a * (vertexX ** 2) + b * vertexX + c;
    let roots = [];
    if (D > 0) {
        roots = [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)];
    } else if (D === 0) {
        roots = [-b / (2 * a)];
    }
    return { D, vertexX, vertexY, roots, yIntercept: c };
  }, [a, b, c, type]);
  // --- ЛОГИКА ГЕНЕРАЦИИ ГРАФИКА ---
  const getPathFor = (params) => {
    const { ta, tb, tc, tType } = params;
    let path = "";
    // Увеличиваем точность (шаг 0.05) для красоты кривых
    for (let x = -6; x <= 6; x += 0.05) {
      let y = 0;
      if (tType === 'line') {
        y = ta * x + tb;
      } else if (tType === 'parabola') {
        y = ta * (x * x) + tb * x + tc;
      } else if (tType === 'physics') {
        // Упрощенная баллистика: y = x*tan(θ) - (g*x²) / (2*v²*cos²(θ))
        // Здесь a — это v (скорость), b — это угол (в радианах через ползунок)
        const g = 9.8;
        const angle = tb; // передаем уже в радианах
        const v = ta;
        if (x >= 0) { // Снаряд летит только вперед
          y = x * Math.tan(angle) - (g * (x * x)) / (2 * (v * v) * (Math.cos(angle) ** 2));
        } else y = -100; // прячем хвост за экран
      }
      
      const px = mapX(x);
      const py = mapY(y);
      
      if (px >= -10 && px <= GRID_SIZE + 10 && py >= -10 && py <= GRID_SIZE + 10) {
        path += (path === "" ? "M" : "L") + `${px},${py}`;
      }
    }
    return path;
  };

  const mainPath = useMemo(() => 
    getPathFor({ ta: a, tb: b, tc: c, tType: type }), 
  [a, b, c, type]);

  const ghostPath = useMemo(() => 
    ghost ? getPathFor({ ta: ghost.a, tb: ghost.b, tc: ghost.c, tType: ghost.type }) : null, 
  [ghost]);

  // Функции управления
  const adjust = (param, val) => {
    haptic.impact('medium');
    const setter = param === 'a' ? setA : param === 'b' ? setB : setC;
    setter(prev => Math.round((prev + val) * 100) / 100);
  };

  const saveToGhost = () => {
    haptic.notification('medium');
    setGhost({ a, b, c, type });
  };

  const clearGhost = () => {
    setGhost(null);
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Лаборатория Pro</Text>
        <TouchableOpacity onPress={ghost ? clearGhost : saveToGhost}>
          <Ionicons name={ghost ? "layers-off" : "copy-outline"} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* СЕЛЕКТОР ТИПА */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
          {['line', 'parabola', 'physics'].map((t) => (
            <TouchableOpacity 
              key={t}
              style={[styles.tab, type === t && { backgroundColor: colors.primary }]} 
              onPress={() => { 
                setType(t); 
                setA(t === 'physics' ? 10 : 1); 
                setB(t === 'physics' ? 0.78 : 0); // 45 градусов для физики
                setC(0);
              }}
            >
              <Text style={[styles.tabText, { color: type === t ? '#FFF' : colors.textMuted }]}>
                {t === 'line' ? 'Линейная' : t === 'parabola' ? 'Парабола' : 'Физика'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ГРАФИК SVG */}
        <View style={[styles.graphWrapper, { backgroundColor: isDarkMode ? '#1A202C' : '#F7FAFC' }]}>
          <Svg width={GRID_SIZE} height={GRID_SIZE}>
            {/* Сетка */}
            <G stroke={colors.textPrimary} strokeWidth="0.5" opacity={0.1}>
              {[...Array(11)].map((_, i) => (
                <React.Fragment key={i}>
                  <Line x1={i * STEP} y1="0" x2={i * STEP} y2={GRID_SIZE} />
                  <Line x1="0" y1={i * STEP} x2={GRID_SIZE} y2={i * STEP} />
                </React.Fragment>
              ))}
            </G>

            {/* Оси */}
            <Line x1="0" y1={GRID_SIZE/2} x2={GRID_SIZE} y2={GRID_SIZE/2} stroke={colors.textMuted} strokeWidth="2" />
            <Line x1={GRID_SIZE/2} y1="0" x2={GRID_SIZE/2} y2={GRID_SIZE} stroke={colors.textMuted} strokeWidth="2" />

            {/* Призрачный график (сравнение) */}
            {ghostPath && (
              <Path d={ghostPath} fill="none" stroke={colors.textMuted} strokeWidth="2" strokeDasharray="5,5" opacity={0.5} />
            )}

            {/* Основной график */}
            <Path d={mainPath} fill="none" stroke={colors.primary} strokeWidth="4" />

            {/* АНАЛИТИЧЕСКИЕ ТОЧКИ */}
            {type !== 'physics' && (
              <G>
                {/* Точка Y-пересечения */}
                <Circle cx={mapX(0)} cy={mapY(analysis.yIntercept)} r="5" fill="#E67E22" />
                
                {/* Корни (X-пересечения) */}
                {type === 'line' && analysis.rootX !== null && (
                  <Circle cx={mapX(analysis.rootX)} cy={mapY(0)} r="5" fill="#2ECC71" />
                )}

                {/* Исправленный мапинг корней параболы */}
                {type === 'parabola' && analysis.roots.map((r, i) => (
                  <Circle key={`root-${i}`} cx={mapX(r)} cy={mapY(0)} r="5" fill="#2ECC71" />
                ))}

                {/* Вершина параболы */}
                {type === 'parabola' && (
                  <Circle cx={mapX(analysis.vertexX)} cy={mapY(analysis.vertexY)} r="6" fill="#FF5E5E" />
                )}
              </G>
            )}
            
          </Svg>
        </View>

        {/* ПАНЕЛЬ АНАЛИЗА (ДИНАМИЧЕСКИЙ ТЕКСТ) */}
        <View style={[styles.analysisCard, { backgroundColor: colors.surface }]}>
           <Text style={[styles.formulaText, { color: colors.primary }]}>
             {type === 'line' ? `f(x) = ${a}x + ${b}` : 
              type === 'parabola' ? `f(x) = ${a}x² + ${b}x + ${c}` : 
              `V₀ = ${a} м/с, α = ${Math.round(b * 180 / Math.PI)}°`}
           </Text>
           {type === 'parabola' && (
             <Text style={[styles.analysisData, { color: colors.textMuted }]}>
               D = {analysis.D.toFixed(2)} | Вершина: ({analysis.vertexX.toFixed(1)}; {analysis.vertexY.toFixed(1)})
             </Text>
           )}
        </View>
        {/* ПУЛЬТ УПРАВЛЕНИЯ */}
        <View style={styles.controls}>
          {type === 'physics' ? (
            <>
              <ControlRow 
                label="Нач. скорость (м/с)" 
                val={a} 
                onAdj={(v) => adjust('a', v)} 
                colors={colors} 
                step={1} 
              />
              <ControlRow 
                label="Угол броска (град)" 
                val={Math.round(b * 180 / Math.PI)} 
                onAdj={(v) => adjust('b', (v * Math.PI / 180))} 
                colors={colors} 
                step={5} 
              />
            </>
          ) : (
            <>
              <ControlRow 
                label={type === 'line' ? "Угловой коэф. (a)" : "Коэф. деформации (a)"} 
                val={a} 
                onAdj={(v) => adjust('a', v)} 
                colors={colors} 
                step={0.1} 
              />
              <ControlRow 
                label={type === 'line' ? "Свободный член (b)" : "Линейный коэф. (b)"} 
                val={b} 
                onAdj={(v) => adjust('b', v)} 
                colors={colors} 
                step={0.5} 
              />
              {type === 'parabola' && (
                <ControlRow 
                  label="Свободный член (c)" 
                  val={c} 
                  onAdj={(v) => adjust('c', v)} 
                  colors={colors} 
                  step={0.5} 
                />
              )}
            </>
          )}
        </View>

        {/* ПОДСКАЗКА ДЛЯ КОМИССИИ */}
        <View style={styles.hintBox}>
          <Ionicons name="bulb-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.hintText, { color: colors.textMuted }]}>
            Используйте иконку в шапке для сравнения двух графиков
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

// Вспомогательный компонент строки управления
const ControlRow = ({ label, val, onAdj, colors, step }) => (
  <View style={styles.controlRow}>
    <Text style={[styles.paramLabel, { color: colors.textPrimary }]}>{label}</Text>
    <View style={styles.btnGroup}>
      <TouchableOpacity 
        style={[styles.adjBtn, { backgroundColor: colors.surface }]} 
        onPress={() => onAdj(-step)}
      >
        <Ionicons name="remove" size={20} color={colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.valText, { color: colors.textPrimary }]}>{val}</Text>
      <TouchableOpacity 
        style={[styles.adjBtn, { backgroundColor: colors.surface }]} 
        onPress={() => onAdj(step)}
      >
        <Ionicons name="add" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  tabBar: { flexDirection: 'row', padding: 5, borderRadius: 15, marginVertical: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabText: { fontWeight: 'bold', fontSize: 12 },
  graphWrapper: { alignSelf: 'center', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', elevation: 4 },
  analysisCard: { padding: 18, borderRadius: 24, marginTop: 20, alignItems: 'center', elevation: 2 },
  formulaText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  analysisData: { fontSize: 11, marginTop: 6, fontWeight: '700', letterSpacing: 0.5 },
  controls: { marginTop: 25, gap: 15 },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paramLabel: { fontSize: 14, fontWeight: '600' },
  btnGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adjBtn: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowOpacity: 0.1 },
  valText: { fontSize: 16, fontWeight: 'bold', minWidth: 50, textAlign: 'center' },
  hintBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 30, opacity: 0.6 },
  hintText: { fontSize: 11, fontStyle: 'italic' }
});

export default LabScreen;
