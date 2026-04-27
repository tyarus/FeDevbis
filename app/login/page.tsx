"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import { LoginInput } from "@/types";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setApiError(null);
    clearError();
    try {
      await login(data);
      router.push("/dashboard");
    } catch (err: any) {
      setApiError(err.response?.data?.message || "Login gagal");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center section-padding bg-bg-primary">
      <div className="w-full max-w-form">
        <div className="text-center mb-8">
          <h1 className="text-section-heading text-text-primary mb-2">Masuk ke Akun</h1>
          <p className="text-body text-text-secondary">
            Belum punya akun?{" "}
            <Link href="/register" className="text-accent-primary hover:underline font-medium">
              Daftar di sini
            </Link>
          </p>
        </div>

        {(apiError || error) && (
          <div className="mb-6 p-4 bg-accent-error/10 border border-accent-error rounded-input text-accent-error text-sm">
            {apiError || error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-label text-text-primary mb-2">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="nama@contoh.com"
              className="input-base w-full text-body"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-xs text-accent-error mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-label text-text-primary mb-2">
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className="input-base w-full text-body"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-xs text-accent-error mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full text-xs font-medium"
          >
            {isLoading ? "Sedang Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
