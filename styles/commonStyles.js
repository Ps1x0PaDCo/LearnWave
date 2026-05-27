export const buttonStyles = (colors) => StyleSheet.create({
  primary: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    // Тень для iOS
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    // Тень для Android
    elevation: 8,
  },
  secondary: {
    height: 60,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary + '30', // Полупрозрачная граница
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  }
});
