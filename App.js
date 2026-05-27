import React, { useContext } from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet } from 'react-native';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ИМПОРТ КОНТЕКСТА
import { AuthProvider, AuthContext } from './context/AuthContext';

// ИМПОРТ ВСЕХ ЭКРАНОВ ИЗ ОДНОЙ ТОЧКИ
import {
  LoginScreen,
  RegisterScreen,
  HomeScreen,
  CoursesScreen,
  SubjectSelectionScreen,
  TopicSelectionScreen,
  ContentScreen,
  ProfileScreen,
  MyCoursesScreen,
  AchievementsScreen,
  AdminPanel,
  ReferenceScreen,
  QuizScreen,
  LabScreen,
  ShopScreen,
} from './screens';

// LogBox.ignoreLogs(['?? Сюда можно вписать конкретное варнинг-сообщение, которое нужно скрыть']);

const Stack = createStackNavigator();

const RootNavigation = () => {
  const { isLoggedIn, isLoading } = useContext(AuthContext);

  // Исправлено: Вместо белого экрана показываем индикатор загрузки, пока проверяется сессия
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS
      }}
    >
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          {/* Унифицированы названия роутов (убраны лишние суффиксы Screen) */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Courses" component={CoursesScreen} />
          <Stack.Screen name="SubjectSelection" component={SubjectSelectionScreen} />
          <Stack.Screen name="TopicSelection" component={TopicSelectionScreen} />
          <Stack.Screen name="Content" component={ContentScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="MyCourses" component={MyCoursesScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="Admin" component={AdminPanel} />
          <Stack.Screen name="LabScreen" component={LabScreen} />
          <Stack.Screen name="ReferenceScreen" component={ReferenceScreen} />
          <Stack.Screen name="Shop" component={ShopScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const App = () => (
  <SafeAreaProvider>
    <AuthProvider>
      <NavigationContainer>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <RootNavigation />
      </NavigationContainer>
    </AuthProvider>
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

registerRootComponent(App);
export default App;
