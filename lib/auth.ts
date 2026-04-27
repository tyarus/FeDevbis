import { apiClient } from "@/lib/api";
import { User, LoginInput, RegisterInput, AuthResponse } from "@/types";

export const authAPI = {
  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  },

  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },
};

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token);
  }
};

export const clearAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
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
  }
};
