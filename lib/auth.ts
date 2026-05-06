import { apiClient } from "@/lib/api";
import { User, LoginInput, RegisterInput, AuthResponse } from "@/types";

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const extractApiData = <T>(payload: unknown): T => {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data?: unknown }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
};

const setCookie = (name: string, value: string): void => {
  if (typeof window === "undefined") return;

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
};

const clearCookie = (name: string): void => {
  if (typeof window === "undefined") return;

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
};

export const authAPI = {
  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/login", data);
    return extractApiData<AuthResponse>(response.data);
  },

  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/register", data);
    return extractApiData<AuthResponse>(response.data);
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get("/me");
    return extractApiData<User>(response.data);
  },
};

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token);
    setCookie("auth_token", token);
  }
};

export const clearAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    clearCookie("auth_token");
    clearCookie("auth_user");
  }
};

export const getAuthUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("auth_user");
  return user ? JSON.parse(user) : null;
};

export const setAuthUser = (user: User): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_user", JSON.stringify(user));
    setCookie("auth_user", JSON.stringify(user));
  }
};
