// config.js
// URL берётся из переменной окружения EXPO_PUBLIC_API_URL
// Задай её в файле .env в корне проекта (см. .env.example)
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
export const API_URL  = BASE_URL; // алиас для обратной совместимости
