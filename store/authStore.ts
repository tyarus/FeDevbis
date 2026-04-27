import { create } from "zustand";
import { User, LoginInput, RegisterInput } from "@/types";
import { authAPI, setAuthToken, clearAuthToken, setAuthUser, getAuthUser } from "@/lib/auth";

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  login: async (data: LoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(data);
      setAuthToken(response.token);
      setAuthUser(response.user);
      set({
        user: response.user,
        token: response.token,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Login failed";
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (data: RegisterInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.register(data);
      setAuthToken(response.token);
      setAuthUser(response.user);
      set({
        user: response.user,
        token: response.token,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Registration failed";
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.logout();
    } finally {
      clearAuthToken();
      set({
        user: null,
        token: null,
        isLoading: false,
      });
    }
  },

  initialize: async () => {
    if (typeof window === "undefined") {
      set({ isInitialized: true });
      return;
    }

    set({ isLoading: true });
    try {
      const user = getAuthUser();
      if (user) {
        set({
          user,
          token: localStorage.getItem("auth_token"),
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error) {
      clearAuthToken();
      set({
        user: null,
        token: null,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
