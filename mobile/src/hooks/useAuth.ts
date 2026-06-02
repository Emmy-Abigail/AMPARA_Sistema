import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { registrarPushToken } from '../services/notifications';
import { startSyncListeners } from '../services/sync';
import { storage, StorageKeys } from '../store/storage';
import { useAuthContext } from '../store/auth-context';
import type { LoginPayload, RegisterPayload, UpdatePerfilPayload, CambiarPasswordPayload } from '../types';

export function useAuth() {
  const { setIsAuthenticated, usuario, setUsuario } = useAuthContext();

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (data) => {
      setUsuario(data.usuario);
      setIsAuthenticated(true);
      registrarPushToken();
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    // Sin onSuccess: requiere login explícito tras registrarse
  });

  const updatePerfilMutation = useMutation({
    mutationFn: (payload: UpdatePerfilPayload) => authService.updatePerfil(payload),
    onSuccess: (data) => { setUsuario(data.data); },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: CambiarPasswordPayload) => authService.changePassword(payload),
  });

  // Acceso anónimo: no crea cuenta, persiste la sesión guest en storage
  const loginAsGuest = useCallback(async () => {
    await storage.setItem(StorageKeys.GUEST_MODE, 'true');
    setUsuario(null);
    setIsAuthenticated(true);
    startSyncListeners();
  }, [setIsAuthenticated, setUsuario]);

  const logout = useCallback(async () => {
    await Promise.all([
      authService.logout(),
      storage.removeItem(StorageKeys.GUEST_MODE),
    ]);
    setUsuario(null);
    setIsAuthenticated(false);
  }, [setIsAuthenticated, setUsuario]);

  return {
    usuario,
    isAuthenticated:    !!setIsAuthenticated,
    isGuest:            usuario === null,
    login:              loginMutation.mutateAsync,
    register:           registerMutation.mutateAsync,
    loginAsGuest,
    updatePerfil:       updatePerfilMutation.mutateAsync,
    changePassword:     changePasswordMutation.mutateAsync,
    logout,
    isLoggingIn:        loginMutation.isPending,
    isRegistering:      registerMutation.isPending,
    isUpdatingPerfil:   updatePerfilMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    loginError:         loginMutation.error,
  };
}
