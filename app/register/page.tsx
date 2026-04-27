"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import { RegisterInput } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components";

const registerSchema = z
  .object({
    name: z.string().min(3, "Nama minimal 3 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    password_confirmation: z.string(),
    role: z.enum(["buyer", "seller"]),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Password tidak cocok",
    path: ["password_confirmation"],
  });

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "buyer",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterInput) => {
    setApiError(null);
    clearError();
    try {
      await registerUser(data);
      const redirectUrl = data.role === "seller" ? "/seller/dashboard" : "/dashboard";
      router.push(redirectUrl);
    } catch (err: any) {
      setApiError(err.response?.data?.message || "Pendaftaran gagal");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center section-padding bg-bg-primary">
      <div className="w-full max-w-form">
        <div className="text-center mb-8">
          <h1 className="text-section-heading text-text-primary mb-2">Daftar Akun Baru</h1>
          <p className="text-body text-text-secondary">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-accent-primary hover:underline font-medium">
              Masuk di sini
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
            <label htmlFor="name" className="block text-label text-text-primary mb-2">
              Nama Lengkap
            </label>
            <input
              {...register("name")}
              type="text"
              placeholder="Masukkan nama Anda"
              className="input-base w-full text-body"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-xs text-accent-error mt-1">{errors.name.message}</p>
            )}
          </div>

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
            <label htmlFor="role" className="block text-label text-text-primary mb-2">
              Daftar Sebagai
            </label>
            <Select value={selectedRole} onValueChange={(value) => setValue("role", value as "buyer" | "seller")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih peran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Pembeli</SelectItem>
                <SelectItem value="seller">Penjual</SelectItem>
              </SelectContent>
            </Select>
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

          <div>
            <label htmlFor="password_confirmation" className="block text-label text-text-primary mb-2">
              Konfirmasi Password
            </label>
            <input
              {...register("password_confirmation")}
              type="password"
              placeholder="••••••••"
              className="input-base w-full text-body"
              disabled={isLoading}
            />
            {errors.password_confirmation && (
              <p className="text-xs text-accent-error mt-1">{errors.password_confirmation.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full text-xs font-medium"
          >
            {isLoading ? "Sedang Mendaftar..." : "Daftar"}
          </button>
        </form>
      </div>
    </div>
  );
}
