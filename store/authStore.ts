import { create } from "zustand";
import { User, LoginInput, RegisterInput } from "@/types";
import { authAPI, setAuthToken, clearAuthToken, setAuthUser, getAuthUser } from "@/lib/auth";

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as { response?: { data?: { message?: string } } };
    if (maybeError.response?.data?.message) {
      return maybeError.response.data.message;
    }
  }

  return fallback;
};

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  login: (data: LoginInput) => Promise<User>;
  register: (data: RegisterInput) => Promise<User>;
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
      return response.user;
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, "Login failed");
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
      return response.user;
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, "Registration failed");
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
    } catch {
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
