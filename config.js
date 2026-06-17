import Constants from 'expo-constants';
// config.js
// URL Р±РµСЂС‘С‚СЃСЏ РёР· РїРµСЂРµРјРµРЅРЅРѕР№ РѕРєСЂСѓР¶РµРЅРёСЏ EXPO_PUBLIC_API_URL
// Р—Р°РґР°Р№ РµС‘ РІ С„Р°Р№Р»Рµ .env РІ РєРѕСЂРЅРµ РїСЂРѕРµРєС‚Р° (СЃРј. .env.example)
export const BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
export const API_URL  = BASE_URL; // Р°Р»РёР°СЃ РґР»СЏ РѕР±СЂР°С‚РЅРѕР№ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚Рё

