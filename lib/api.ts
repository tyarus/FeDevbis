import axios, { AxiosInstance, AxiosError } from "axios";
import { ApiError } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const clearClientAuthStorage = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  document.cookie = "auth_token=; Path=/; Max-Age=0; SameSite=Lax";
  document.cookie = "auth_user=; Path=/; Max-Age=0; SameSite=Lax";
};

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const shouldSkipAuthRedirect = Boolean(
      (error.config as { skipAuthRedirect?: boolean } | undefined)?.skipAuthRedirect
    );

    if (error.response?.status === 401 && !shouldSkipAuthRedirect) {
      // Clear auth token and redirect to login
      clearClientAuthStorage();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
