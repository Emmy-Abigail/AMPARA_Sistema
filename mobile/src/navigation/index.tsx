import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { useAuthContext } from '../store/auth-context';

import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ReportScreen from '../screens/ReportScreen';
import SOSScreen from '../screens/SOSScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import InfoScreen from '../screens/InfoScreen';
import ReporteDetalleScreen from '../screens/ReporteDetalleScreen';
import PerfilScreen from '../screens/PerfilScreen';
import EditarPerfilScreen from '../screens/EditarPerfilScreen';
import CambiarPasswordScreen from '../screens/CambiarPasswordScreen';
import type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  MainStackParamList,
} from '../types';

const RootStack  = createNativeStackNavigator<RootStackParamList>();
const AuthStack  = createNativeStackNavigator<AuthStackParamList>();
const MainTab    = createBottomTabNavigator<MainTabParamList>();
const MainStack  = createNativeStackNavigator<MainStackParamList>();

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
      <AuthStack.Screen name="Welcome"  component={WelcomeScreen} />
      <AuthStack.Screen name="Login"    component={LoginScreen}   />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Bottom Tab principal (5 tabs, SOS central) ───────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<
  Exclude<keyof MainTabParamList, 'SOS'>,
  { label: string; icon: IoniconName; iconActive: IoniconName }
> = {
  Home:      { label: 'Inicio',    icon: 'home-outline',      iconActive: 'home'        },
  Report:    { label: 'Reportar',  icon: 'document-text-outline', iconActive: 'document-text' },
  MyReports: { label: 'Mis casos', icon: 'folder-outline',    iconActive: 'folder'      },
  Info:      { label: 'Recursos',  icon: 'heart-outline',     iconActive: 'heart'       },
};

function TabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <MainTab.Navigator
      id="MainTab"
      screenOptions={({ route }) => {
        if (route.name === 'SOS') return { headerShown: false };
        const config = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
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
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom || 8,
            paddingTop: 8,
            elevation: 8,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
          },
        };
      }}
    >
      <MainTab.Screen name="Home"      component={HomeScreen}      />
      <MainTab.Screen name="Report"    component={ReportScreen}    />

      {/* SOS — botón central elevado, rojo, accesible siempre */}
      <MainTab.Screen
        name="SOS"
        component={SOSScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.sosTabBtn, focused && styles.sosTabBtnActive]}>
              <Ionicons name="warning" size={26} color="#FFFFFF" />
            </View>
          ),
          tabBarLabel: () => (
            <Text style={styles.sosTabLabel}>SOS</Text>
          ),
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom || 8,
            paddingTop: 8,
            elevation: 8,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
          },
          tabBarItemStyle: styles.sosTabItem,
        }}
      />

      <MainTab.Screen name="MyReports" component={MyReportsScreen} />
      <MainTab.Screen name="Info"      component={InfoScreen}      />
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
      screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 300 }}
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

// ─── Estilos ──────────────────────────────────────────────────────────────────

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

  // SOS tab — botón circular elevado y rojo
  sosTabItem: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? -18 : -14, // eleva el botón sobre el tab bar
  },
  sosTabBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  sosTabBtnActive: {
    backgroundColor: '#B71C1C',
  },
  sosTabLabel: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10,
    color: '#E53935',
    marginTop: 2,
  },
});
