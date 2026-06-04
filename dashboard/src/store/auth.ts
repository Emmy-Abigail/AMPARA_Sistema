import { create } from 'zustand';

interface AuthUser {
  nombre: string;
  email: string;
  rol: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: localStorage.getItem('ampara_token'),
  user: (() => {
    try { return JSON.parse(localStorage.getItem('ampara_user') || 'null'); }
    catch { return null; }
  })(),
  login: (token, user) => {
    localStorage.setItem('ampara_token', token);
    localStorage.setItem('ampara_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('ampara_token');
    localStorage.removeItem('ampara_user');
    set({ token: null, user: null });
  },
}));
