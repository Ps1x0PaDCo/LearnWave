import React, { useContext, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import apiClient from '../services/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ShopScreen = ({ navigation }) => {
    const { user, setUser, isDarkMode, buyInterfaceBorder } = useContext(AuthContext);
    const colors = getThemeColors(isDarkMode);

    const [activeTab, setActiveTab] = useState('boosts'); // 'boosts' или 'cosmetics'
    const [buyingId, setBuyingId] = useState(null); // Для отображения загрузки на конкретной кнопке

    // Список товаров магазина
    const SHOP_ITEMS = {
        boosts: [
            { id: 'freeze', type: 'streak_freeze', value: 'freeze_day', title: 'Заморозка серии', desc: 'Спасет твой ежедневный стрик, если ты пропустишь один день учебы.', price: 150, icon: 'snow-outline', color: '#00B4D8' },
            { id: 'hint_3', type: 'quiz_hint', value: 'hint_x3', title: 'Пакет подсказок (x3)', desc: 'Добавляет 3 подсказки "50/50" для сложных вопросов в тестах.', price: 100, icon: 'help-buoy-outline', color: '#F1C40F' },
        ],
        cosmetics: [
            { id: 'frame_bronze', type: 'frame', value: 'bronze_frame', title: 'Бронзовая рамка', desc: 'Выделит твой аватар стильным бронзовым свечением в лидерборде.', price: 250, icon: 'ribbon-outline', color: '#CD7F32' },
            { id: 'frame_gold', type: 'frame', value: 'gold_frame', title: 'Золотая рамка', desc: 'Премиальный золотой ободок для истинных магистров знаний.', price: 500, icon: 'trophy-outline', color: '#FFD700' },
            
            // Новые товары
            { id: 'frame_platinum', type: 'frame', value: 'platinum_frame', title: 'Платиновый апгрейд', desc: 'Благородный стальной оттенок платины для лучших исследователей.', price: 750, icon: 'shield-checkmark-outline', color: '#E5E4E2' },
            { id: 'frame_neon', type: 'frame', value: 'neon_frame', title: 'Неоновый кастом', desc: 'Ультрасовременная переливающаяся рамка для топ-технарей.', price: 1000, icon: 'flash-outline', color: '#FF0055' },
            { id: 'frame_matrix', type: 'frame', value: 'matrix_frame', title: 'Матричный код', desc: 'Ядовито-зеленый цифровой ободок для хакеров и специалистов по ИБ.', price: 1500, icon: 'terminal-outline', color: '#00FF41' },
        ]

    };

  const handleBuy = async (item) => {
    if ((user?.balance || 0) < item.price) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Упс! 🥺', 'Недостаточно монет. Проходи новые лекции и тесты, чтобы заработать валюту!');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuyingId(item.id);

    // ============================================================
    // СЦЕНАРИЙ 1: ПОКУПКА КАСКАДНОЙ РАМКИ (КОСМЕТИКА)
    // ============================================================
    if (item.type === 'frame') {
      try {
        const borderId = item.id.replace('frame_', ''); // 'bronze', 'gold', 'neon'
        const result = await buyInterfaceBorder(borderId, item.price);

        if (result.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Ура! 🎉', `Внешний вид "${item.title}" успешно применён!`);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Ошибка покупки', result.error || 'Сервер отклонил транзакцию.');
        }
      } catch (err) {
        console.log('❌ Сбой транзакции рамки на экране магазина:', err.message);
        Alert.alert('Ошибка', 'Не удалось применить кастомизацию.');
      } finally {
        setBuyingId(null);
      }
      return; 
    }

    // ============================================================
    // СЦЕНАРИЙ 2: ПОКУПКА БУСТЕРОВ ЗНАНИЙ (ПОДСКАЗКИ, ЗАМОРОЗКА)
    // ============================================================
    try {
      // Отправляем запрос на Node.js бэкенд
      const res = await apiClient.post('/api/shop/buy', {
        item_type: item.type,
        item_value: item.value,
        price: item.price
      });

      if (res.data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Обновляем кошелек пользователя в оперативной памяти приложения
        const newBalance = res.data.newBalance || ((user?.balance || 0) - item.price);
        setUser(prev => prev ? { ...prev, balance: newBalance } : null);

        // 💡 КЭШИРУЕМ БАЛАНС В SQLite (Полноценный оффлайн-режим)
        try {
          const { db } = require('../services/db'); // Безопасный вызов локальной базы
          if (db && user?.username) {
            db.runSync('UPDATE users SET balance = ? WHERE username = ?;', [newBalance, user.username]);
          }
        } catch (sqliteErr) {
          console.log('⚠️ Ошибка синхронизации баланса бустеров в SQLite:', sqliteErr.message);
        }

        Alert.alert('Ура! 🎉', `Товар "${item.title}" успешно приобретён!`);
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.log('🚨 Сбой при покупке бустера в магазине:', err.message);
      Alert.alert('Ошибка', 'Не удалось связаться с сервером.');
    } finally {
      setBuyingId(null);
    }
  };



    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* HEADER С БАЛАНСОМ */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                {/* Монетки крупным планом */}
                <View style={[styles.balanceBadge, { backgroundColor: '#F1C40F20', borderColor: '#F1C40F40' }]}>
                    <Text style={{ fontSize: 18, marginRight: 6 }}>🪙</Text>
                    <Text style={[styles.balanceText, { color: colors.textPrimary }]}>{user?.balance || 0}</Text>
                </View>
            </View>

            <View style={styles.titleSection}>
                <Text style={[styles.shopTitle, { color: colors.textPrimary }]}>Wave-Shop</Text>
                <Text style={[styles.shopSub, { color: colors.textMuted }]}>Конвертируй свои знания в полезные бонусы и кастомизацию</Text>
            </View>

            {/* ТАБЫ ПЕРЕКЛЮЧЕНИЯ */}
            <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'boosts' && { backgroundColor: colors.primary }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('boosts'); }}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'boosts' ? '#FFF' : colors.textPrimary }]}>Бонусы</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'cosmetics' && { backgroundColor: colors.primary }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('cosmetics'); }}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'cosmetics' ? '#FFF' : colors.textPrimary }]}>Внешний вид</Text>
                </TouchableOpacity>
            </View>

            {/* СПИСОК ТОВАРОВ */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {SHOP_ITEMS[activeTab].map((item) => (
                    <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                            <Ionicons name={item.icon} size={32} color={item.color} />
                        </View>

                        <View style={styles.itemInfo}>
                            <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                            <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.desc}</Text>

                            <TouchableOpacity
                                style={[styles.buyBtn, { backgroundColor: item.color }]}
                                onPress={() => handleBuy(item)}
                                disabled={buyingId !== null}
                            >
                                {buyingId === item.id ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Text style={styles.buyBtnText}>Купить за </Text>
                                        <Text style={{ fontSize: 14, marginRight: 4 }}>🪙</Text>
                                        <Text style={styles.buyBtnPrice}>{item.price}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 2 },
    balanceBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
    balanceText: { fontSize: 16, fontWeight: 'bold' },
    titleSection: { paddingHorizontal: 20, marginBottom: 20 },
    shopTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 6 },
    shopSub: { fontSize: 14, lineHeight: 20 },
    tabsContainer: { flexDirection: 'row', marginHorizontal: 20, height: 50, borderRadius: 16, borderWidth: 1, padding: 4, marginBottom: 20 },
    tab: { flex: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    tabText: { fontSize: 14, fontWeight: 'bold' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
    itemCard: { flexDirection: 'row', padding: 20, borderRadius: 26, borderWidth: 1, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8 },
    iconContainer: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
    itemInfo: { flex: 1, justifyContent: 'center' },
    itemTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    itemDesc: { fontSize: 12, lineHeight: 18, marginBottom: 15 },
    buyBtn: { height: 42, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: 160 },
    buyBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
    buyBtnPrice: { color: '#FFF', fontSize: 14, fontWeight: '900' }
    });
export default ShopScreen;
