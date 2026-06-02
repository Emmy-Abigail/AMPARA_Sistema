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

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('sivapre_token'),
  user: (() => {
    try { return JSON.parse(localStorage.getItem('sivapre_user') || 'null'); }
    catch { return null; }
  })(),
  login: (token, user) => {
    localStorage.setItem('sivapre_token', token);
    localStorage.setItem('sivapre_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('sivapre_token');
    localStorage.removeItem('sivapre_user');
    set({ token: null, user: null });
  },
}));
