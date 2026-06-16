import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const SplashScreen = ({ onFinish }) => {
  // ИСПРАВЛЕНО: useRef вместо new Animated.Value() напрямую —
  // без useRef объект пересоздавался при каждом рендере
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        alignItems: 'center',
      }}>
        <View style={styles.logoCircle}>
          <Ionicons name="school" size={60} color="#FFF" />
        </View>
        <Text style={styles.title}>LearnWave</Text>
        <Text style={styles.subtitle}>Твоя волна знаний</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  logoCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#FFF', letterSpacing: 2 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 10, fontWeight: '500' },
});

export default SplashScreen;
