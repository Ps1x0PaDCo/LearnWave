import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getThemeColors } from '../styles/colors';
import apiClient from '../services/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const haptic = {
  impact: (style) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.impactAsync(style); } },
  notification: (type) => { if (Platform.OS !== 'web') { const H = require('expo-haptics'); H.notificationAsync(type); } },
};

const SHOP_ITEMS = {
  boosts: [
    {
      id: 'freeze',
      type: 'streak_freeze',
      value: 'freeze_day',
      title: 'Заморозка серии',
      desc: 'Сохраняет серию, если пропущен один день обучения. Заряды копятся на аккаунте.',
      price: 150,
      icon: 'snow-outline',
      color: '#00B4D8'
    },
    {
      id: 'hint_3',
      type: 'quiz_hint',
      value: 'hint_x3',
      title: 'Пакет подсказок x3',
      desc: 'Добавляет 3 подсказки 50/50 для сложных вопросов в квизах.',
      price: 100,
      icon: 'help-buoy-outline',
      color: '#F1C40F'
    },
  ],
  cosmetics: [
    { id: 'frame_bronze', type: 'frame', value: 'bronze_frame', title: 'Бронзовая рамка', desc: 'Тёплый бронзовый контур для профиля.', price: 250, icon: 'ribbon-outline', color: '#CD7F32' },
    { id: 'frame_gold', type: 'frame', value: 'gold_frame', title: 'Золотая рамка', desc: 'Премиальный золотой акцент для активного ученика.', price: 500, icon: 'trophy-outline', color: '#FFD700' },
    { id: 'frame_platinum', type: 'frame', value: 'platinum_frame', title: 'Платиновая рамка', desc: 'Сдержанный светлый контур для профиля.', price: 750, icon: 'shield-checkmark-outline', color: '#E5E4E2' },
    { id: 'frame_neon', type: 'frame', value: 'neon_frame', title: 'Неоновая рамка', desc: 'Анимированное свечение для заметного профиля.', price: 1000, icon: 'flash-outline', color: '#FF0055' },
    { id: 'frame_matrix', type: 'frame', value: 'matrix_frame', title: 'Матричный код', desc: 'Анимированная цифровая рамка в стиле кода.', price: 1500, icon: 'terminal-outline', color: '#00FF41' },
    { id: 'frame_sapphire', type: 'frame', value: 'sapphire_frame', title: 'Сапфировая рамка', desc: 'Глубокий синий контур для спокойного профиля.', price: 900, icon: 'diamond-outline', color: '#2F80ED' },
    { id: 'frame_emerald', type: 'frame', value: 'emerald_frame', title: 'Изумрудная рамка', desc: 'Свежий зелёный акцент для профиля.', price: 900, icon: 'leaf-outline', color: '#10B981' },
    { id: 'frame_sunset', type: 'frame', value: 'sunset_frame', title: 'Закатная рамка', desc: 'Яркая анимированная рамка с тёплым оттенком.', price: 1200, icon: 'sunny-outline', color: '#FF7A45' },
  ],
};

const ShopScreen = ({ navigation }) => {
  const { user, setUser, isDarkMode, buyInterfaceBorder, activeBorder } = useContext(AuthContext);
  const colors = getThemeColors(isDarkMode);

  const [activeTab, setActiveTab] = useState('boosts');
  const [buyingId, setBuyingId] = useState(null);
  const [ownedFrames, setOwnedFrames] = useState({});
  const [inventoryCounts, setInventoryCounts] = useState({});

  const loadInventory = async () => {
    if (!user?.id && !user?.email && !user?.username) {
      setOwnedFrames({});
      setInventoryCounts({});
      return;
    }
    try {
      const inventoryRes = await apiClient.get('/shop/inventory');
      if (Array.isArray(inventoryRes?.data?.items)) {
        const ownedFromServer = {};
        const countsFromServer = {};
        inventoryRes.data.items.forEach(item => {
          const key = `${item.item_type}:${item.item_value}`;
          countsFromServer[key] = Number(item.quantity || 1);
          if (item.item_type === 'frame') {
            const borderId = String(item.item_value || '').replace('_frame', '');
            if (borderId) ownedFromServer[borderId] = true;
          }
        });
        setOwnedFrames(ownedFromServer);
        setInventoryCounts(countsFromServer);
        return;
      }
    } catch (inventoryErr) {
      console.log('Inventory fallback:', inventoryErr?.message);
    }

    const ownerKey = user.id || user.email || user.username;
    const pairs = await Promise.all(
      SHOP_ITEMS.cosmetics.map(async item => {
        const borderId = item.id.replace('frame_', '');
        const value = await AsyncStorage.getItem(`border_owned_${ownerKey}_${borderId}`);
        return [borderId, value === 'true'];
      })
    );
    setOwnedFrames(Object.fromEntries(pairs));
  };

  useEffect(() => {
    loadInventory();
  }, [user?.id, user?.email, user?.username, activeTab, buyingId]);

  const getInventoryCount = (item) => {
    if (item.type === 'quiz_hint') return inventoryCounts['quiz_hint:hint_5050'] || 0;
    if (item.type === 'streak_freeze') return inventoryCounts['streak_freeze:freeze_day'] || 0;
    return 0;
  };

  const handleBuy = async (item) => {
    const borderId = item.type === 'frame' ? item.id.replace('frame_', '') : null;
    const isOwnedFrame = borderId && ownedFrames[borderId] === true;

    if (!isOwnedFrame && (user?.balance || 0) < item.price) {
      haptic.notification('error');
      Alert.alert('Недостаточно монет', `Для покупки нужно ${item.price} монет.`);
      return;
    }

    haptic.impact('medium');
    setBuyingId(item.id);

    if (item.type === 'frame') {
      try {
        const result = await buyInterfaceBorder(borderId, item.price);
        if (result.success) {
          await loadInventory();
          haptic.notification('success');
          Alert.alert(result.alreadyOwned ? 'Рамка применена' : 'Покупка выполнена', `Рамка "${item.title}" активирована.`);
        } else {
          haptic.notification('error');
          Alert.alert('Ошибка покупки', result.error || 'Сервер отклонил операцию.');
        }
      } catch (err) {
        console.log('Frame purchase error:', err.message);
        Alert.alert('Ошибка', 'Не удалось применить рамку.');
      } finally {
        setBuyingId(null);
      }
      return;
    }

    try {
      const res = await apiClient.post('/shop/buy', {
        item_type: item.type,
        item_value: item.value,
        price: item.price,
      });

      if (res.data.success) {
        haptic.notification('success');
        const newBalance = res.data.newBalance || ((user?.balance || 0) - item.price);
        setUser(prev => prev ? { ...prev, balance: newBalance } : null);
        await loadInventory();
        Alert.alert('Покупка выполнена', `"${item.title}" добавлен в инвентарь.`);
      }
    } catch (err) {
      haptic.notification('error');
      console.log('Booster purchase error:', err.message);
      Alert.alert('Ошибка', 'Не удалось связаться с сервером.');
    } finally {
      setBuyingId(null);
    }
  };

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

        <View style={[styles.balanceBadge, { backgroundColor: '#F1C40F20', borderColor: '#F1C40F40' }]}>
          <Ionicons name="star" size={16} color="#F1C40F" style={{ marginRight: 6 }} />
          <Text style={[styles.balanceText, { color: colors.textPrimary }]}>{user?.balance || 0}</Text>
        </View>
      </View>

      <View style={styles.titleSection}>
        <Text style={[styles.shopTitle, { color: colors.textPrimary }]}>WaveShop</Text>
        <Text style={[styles.shopSub, { color: colors.textMuted }]}>
          Бонусы для обучения, подсказки и оформление профиля.
        </Text>
      </View>

      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'boosts' && { backgroundColor: colors.primary }]}
          onPress={() => { haptic.impact('medium'); setActiveTab('boosts'); }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'boosts' ? '#FFF' : colors.textPrimary }]}>Бонусы</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cosmetics' && { backgroundColor: colors.primary }]}
          onPress={() => { haptic.impact('medium'); setActiveTab('cosmetics'); }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'cosmetics' ? '#FFF' : colors.textPrimary }]}>Рамки</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {SHOP_ITEMS[activeTab].map((item) => {
          const borderId = item.type === 'frame' ? item.id.replace('frame_', '') : null;
          const isOwned = item.type === 'frame' && ownedFrames[borderId] === true;
          const isApplied = item.type === 'frame' && isOwned && activeBorder === borderId;
          const canAfford = (user?.balance || 0) >= item.price;
          const itemCount = getInventoryCount(item);
          const buttonColor = isApplied ? colors.success : isOwned ? colors.primary : canAfford ? item.color : colors.border;

          return (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={32} color={item.color} />
              </View>

              <View style={styles.itemInfo}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                <Text style={[styles.itemPriceLine, { color: canAfford || isOwned ? item.color : colors.textMuted }]}>
                  Стоимость: {item.price} монет
                </Text>
                {item.type !== 'frame' && itemCount > 0 ? (
                  <View style={[styles.countBadge, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name="layers-outline" size={13} color={item.color} />
                    <Text style={[styles.countBadgeText, { color: item.color }]}>В наличии: {itemCount}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.buyBtn, { backgroundColor: buttonColor }]}
                  onPress={() => handleBuy(item)}
                  disabled={buyingId !== null || isApplied}
                >
                  {buyingId === item.id ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : isApplied ? (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                      <Text style={styles.buyBtnText}> Применено</Text>
                    </>
                  ) : isOwned ? (
                    <>
                      <Ionicons name="color-palette-outline" size={15} color="#FFF" />
                      <Text style={styles.buyBtnText}> Применить</Text>
                    </>
                  ) : !canAfford ? (
                    <>
                      <Ionicons name="lock-closed" size={14} color="#FFF" />
                      <Text style={styles.buyBtnText}> Не хватает</Text>
                    </>
                  ) : (
                    <Text style={styles.buyBtnText}>Купить</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
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
  itemPriceLine: { fontSize: 12, fontWeight: '900', marginTop: -6, marginBottom: 12 },
  countBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginTop: -4, marginBottom: 12 },
  countBadgeText: { fontSize: 11, fontWeight: '900' },
  buyBtn: { height: 42, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: 160 },
  buyBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
});

export default ShopScreen;
