//navigation - index.tsx

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme';
import { useAuthContext } from '../store/auth-context';

import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ReportScreen from '../screens/ReportScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import InfoScreen from '../screens/InfoScreen';
import ReporteDetalleScreen from '../screens/ReporteDetalleScreen';
import PerfilScreen from '../screens/PerfilScreen';
import EditarPerfilScreen from '../screens/EditarPerfilScreen';
import CambiarPasswordScreen from '../screens/CambiarPasswordScreen';
import type { MainStackParamList } from '../types';

const MainStack = createNativeStackNavigator<MainStackParamList>();


import type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
} from '../types';

// ─── Stacks y Tab ─────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// ─── Stack de autenticación ───────────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      id="AuthStack"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Configuración de iconos por tab ─────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<
  keyof MainTabParamList,
  { label: string; icon: IoniconName; iconActive: IoniconName }
> = {
  Home: {
    label: 'Inicio',
    icon: 'home-outline',
    iconActive: 'home',
  },
  Report: {
    label: 'Reportar',
    icon: 'add-circle-outline',
    iconActive: 'add-circle',
  },
  MyReports: {
    label: 'Mis reportes',
    icon: 'document-text-outline',
    iconActive: 'document-text',
  },
  Info: {
    label: 'Información',
    icon: 'information-circle-outline',
    iconActive: 'information-circle',
  },
};

// ─── Bottom Tab principal ─────────────────────────────────────────────────────

import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <MainTab.Navigator
      id="MainTab"
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name as keyof MainTabParamList];
        return {
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? config.iconActive : config.icon}
              size={size}
              color={focused ? colors.primary : colors.textSecondary}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                focused ? styles.tabLabelActive : styles.tabLabel,
                { color: focused ? colors.primary : colors.textSecondary },
              ]}
            >
              {config.label}
            </Text>
          ),
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 56 + insets.bottom,
            paddingBottom: insets.bottom || 8,
            paddingTop: 8,
            elevation: 8,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
          },
          tabBarItemStyle:
            route.name === 'Report' ? styles.reportTabItem : undefined,
        };
      }}
    >
      <MainTab.Screen name="Home" component={HomeScreen} />
      <MainTab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.reportBtn, { backgroundColor: colors.primary }]}>
              <Ionicons
                name={focused ? 'add-circle' : 'add-circle-outline'}
                size={28}
                color={colors.textOnPrimary}
              />
            </View>
          ),
        }}
      />
      <MainTab.Screen name="MyReports" component={MyReportsScreen} />
      <MainTab.Screen name="Info" component={InfoScreen} />
    </MainTab.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator id="MainStack" screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Tabs" component={TabNavigator} />
      <MainStack.Screen
        name="ReporteDetalle"
        component={ReporteDetalleScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <MainStack.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <MainStack.Screen
        name="EditarPerfil"
        component={EditarPerfilScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <MainStack.Screen
        name="CambiarPassword"
        component={CambiarPasswordScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </MainStack.Navigator>
  );
}

// ─── Navegador raíz ───────────────────────────────────────────────────────────

export default function RootNavigator() {
  const { isAuthenticated, splashShown } = useAuthContext();

  return (
    <RootStack.Navigator
      id="RootStack"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 300,
      }}
    >
      {!splashShown ? (
        <RootStack.Screen name="Splash" component={SplashScreen} />
      ) : isAuthenticated ? (
        <RootStack.Screen name="Main" component={MainNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 2,
  },
  tabLabelActive: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10,
    marginTop: 2,
  },
  reportTabItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportBtn: {
    width: 52,
    height: 40,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 8 : 4,
    shadowColor: '#0F6E56',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
