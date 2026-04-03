import { create } from 'zustand';
import type { User } from '@/types/admin';

interface AuthState {
  currentUser: User | null;
  authReady: boolean;
  setCurrentUser: (user: User | null) => void;
  clearCurrentUser: () => void;
  setAuthReady: (ready: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  authReady: false,
  setCurrentUser: (user) => set({ currentUser: user, authReady: true }),
  clearCurrentUser: () => set({ currentUser: null, authReady: true }),
  setAuthReady: (ready) => set({ authReady: ready }),
}));
