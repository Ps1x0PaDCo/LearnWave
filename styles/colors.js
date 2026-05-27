// Палитра для светлой темы
const lightColors = {
  primary: '#4A90E2',
  secondary: '#5C6BC0',
  background: '#F5F7FA',   // Светло-серый фон
  surface: '#FFFFFF',      // Белые карточки
  border: '#E2E8F0',
  textPrimary: '#2C3E50',  // Тёмный текст
  textMuted: '#7F8C8D',
  success: '#2ECC71',
  error: '#E74C3C',
};

// Палитра для тёмной темы (Dark Mode)
const darkColors = {
  primary: '#5296E6',      // Чуть более яркий синий для контраста на тёмном
  secondary: '#7986CB',
  background: '#121212',   // Глубокий тёмный фон
  surface: '#1E1E1E',      // Тёмно-серые карточки (эффект глубины)
  border: '#2D2D2D',       // Тёмные разделители
  textPrimary: '#F5F7FA',  // Светлый текст
  textMuted: '#A0AEC0',    // Светло-серый текст
  success: '#2ECC71',
  error: '#E74C3C',
};

// Экспортируем функцию, которая будет отдавать нужные цвета
export const getThemeColors = (isDarkMode) => {
  return isDarkMode ? darkColors : lightColors;
};

// Оставляем старый экспорт COLORS как заглушку, чтобы ничего не сломалось в других файлах
export const COLORS = lightColors;
