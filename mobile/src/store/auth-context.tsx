import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { storage, StorageKeys } from './storage';
import { setUnauthorizedHandler } from './auth-signal';
import { authService } from '../services/auth';
import { registrarPushToken, initNotificationHandler } from '../services/notifications';
import { initDb } from '../services/db';
import { startSyncListeners, stopSyncListeners, registerBackgroundSync, syncPendingReports } from '../services/sync';
import type { Usuario } from '../types';

interface AuthContextValue {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  usuario: Usuario | null;
  setUsuario: (u: Usuario | null) => void;
  splashShown: boolean;
  setSplashShown: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  usuario: null,
  setUsuario: () => {},
  splashShown: false,
  setSplashShown: () => {},
});

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * Solo se usa para leer el campo "exp" localmente y decidir si hace falta refresh.
 * La verificación real de la firma la hace el backend en cada request.
 */
function _getTokenExpiry(token: string): number {
  try {
    const part = token.split('.')[1];
    // atob está disponible en React Native / Expo SDK 47+
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.exp ?? 0) * 1000; // convertir de segundos a milisegundos
  } catch {
    return 0;
  }
}

function _tokenIsExpiredOrExpiresSoon(token: string): boolean {
  const expiry = _getTokenExpiry(token);
  // Consideramos el token "expirado" si queda menos de 60 segundos — margen de seguridad
  // para que no expire justo durante el primer request después del arranque.
  return expiry === 0 || Date.now() >= expiry - 60_000;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [splashShown, setSplashShown] = useState(false);
  const [loading, setLoading] = useState(true);

  const setAuthRef = useRef(setIsAuthenticated);
  setAuthRef.current = setIsAuthenticated;
  const setUsuarioRef = useRef(setUsuario);
  setUsuarioRef.current = setUsuario;

  useEffect(() => {
    initNotificationHandler();
    initDb();

    (async () => {
      const token = await storage.getItem(StorageKeys.AUTH_TOKEN);

      if (token) {
        // Si el token expiró (o está a punto de expirar), intentar renovarlo
        // silenciosamente ANTES de marcar al usuario como autenticado.
        // Evita el "flash": usuario ve HomeScreen → 401 → logout inmediato.
        if (_tokenIsExpiredOrExpiresSoon(token)) {
          const ok = await authService.refreshSession();
          if (!ok) {
            // Refresh fallido: limpiar sesión y pedir login nuevamente.
            await Promise.all([
              storage.removeItem(StorageKeys.AUTH_TOKEN),
              storage.removeItem(StorageKeys.REFRESH_TOKEN),
              storage.removeItem(StorageKeys.USER_DATA),
            ]);
            setLoading(false);
            return;
          }
        }

        const raw = await storage.getItem(StorageKeys.USER_DATA);
        if (raw) {
          try {
            setUsuario(JSON.parse(raw) as Usuario);
          } catch {}
        }
        setIsAuthenticated(true);
        registrarPushToken();
        startSyncListeners();
        registerBackgroundSync();
        syncPendingReports(); // flush any reports pending from a previous session
      }

      setLoading(false);
    })();

    setUnauthorizedHandler(() => {
      setAuthRef.current(false);
      setUsuarioRef.current(null);
      stopSyncListeners();
    });
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, usuario, setUsuario, splashShown, setSplashShown }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
