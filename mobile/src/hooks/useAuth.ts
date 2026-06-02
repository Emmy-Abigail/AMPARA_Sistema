// useAuth.ts
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { registrarPushToken } from '../services/notifications';
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
    // Sin onSuccess: no hace auto-login — el usuario debe iniciar sesión
  });

  const updatePerfilMutation = useMutation({
    mutationFn: (payload: UpdatePerfilPayload) => authService.updatePerfil(payload),
    onSuccess: (data) => {
      setUsuario(data.data);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: CambiarPasswordPayload) => authService.changePassword(payload),
  });

  const logout = useCallback(async () => {
    await authService.logout();
    setUsuario(null);
    setIsAuthenticated(false);
  }, [setIsAuthenticated, setUsuario]);

  return {
    usuario,
    isAuthenticated: !!usuario,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    updatePerfil: updatePerfilMutation.mutateAsync,
    changePassword: changePasswordMutation.mutateAsync,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isUpdatingPerfil: updatePerfilMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    loginError: loginMutation.error,
  };
}
