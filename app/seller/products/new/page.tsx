"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api";
import { CreateProductInput, GameCategory, LoginMethod } from "@/types";
import { saveProductMetadata } from "@/lib/productMetadata";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, GameCategorySelector, LoginMethodSelector, SecurityGuide } from "@/components";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  price: z.number().min(1000, "Harga minimal Rp 1.000"),
  stock: z.number().min(1, "Stok minimal 1 unit"),
  image_url: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  game_category: z.string().optional(),
  login_method: z.string().optional(),
});

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSecurityGuide, setShowSecurityGuide] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      status: "active",
      price: 0,
      stock: 0,
    },
  });

  const status = watch("status");
  const name = watch("name");
  const price = watch("price");
  const stock = watch("stock");
  const gameCategory = watch("game_category") as GameCategory | undefined;
  const loginMethod = watch("login_method") as LoginMethod | undefined;

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Pilih file gambar yang valid (JPG, PNG, GIF, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar tidak boleh lebih dari 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setImagePreview(imageUrl);
      setValue("image_url", imageUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Clear image
  const handleClearImage = () => {
    setImagePreview(null);
    setValue("image_url", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: CreateProductInput) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      const payload = {
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        image_url: data.image_url,
        status: data.status,
      };

      const response = await apiClient.post("/products", payload);
      const createdProductId = response?.data?.data?.id;

      if (createdProductId) {
        saveProductMetadata(createdProductId, {
          game_category: data.game_category ?? gameCategory,
          login_method: data.login_method ?? loginMethod,
        });
      }

      router.push("/seller/products");
    } catch (error: unknown) {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        setApiError(axiosError.response?.data?.message || "Gagal membuat produk");
      } else {
        setApiError("Gagal membuat produk");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="section-padding">
      <div className="max-content">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-xs text-text-secondary hover:text-text-primary mb-4"
          >
            ← Kembali
          </button>
          <h1 className="text-section-heading text-text-primary">Tambah Produk Baru</h1>
        </div>

        {apiError && (
          <div className="mb-6 p-4 bg-accent-error/10 border border-accent-error rounded-input text-accent-error text-sm">
            {apiError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="md:col-span-2 space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-label text-text-primary mb-2">
                Nama Produk
              </label>
              <input
                {...register("name")}
                type="text"
                placeholder="Masukkan nama produk"
                className="input-base w-full text-body"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-xs text-accent-error mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-label text-text-primary mb-2">
                Deskripsi
              </label>
              <textarea
                {...register("description")}
                placeholder="Masukkan deskripsi produk"
                rows={4}
                className="input-base w-full text-body"
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-xs text-accent-error mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-label text-text-primary mb-2">
                Harga (Rupiah)
              </label>
              <input
                {...register("price", { valueAsNumber: true })}
                type="number"
                placeholder="0"
                className="input-base w-full text-body"
                disabled={isSubmitting}
              />
              {errors.price && (
                <p className="text-xs text-accent-error mt-1">{errors.price.message}</p>
              )}
            </div>

            {/* Stock */}
            <div>
              <label htmlFor="stock" className="block text-label text-text-primary mb-2">
                Stok
              </label>
              <input
                {...register("stock", { valueAsNumber: true })}
                type="number"
                placeholder="0"
                className="input-base w-full text-body"
                disabled={isSubmitting}
              />
              {errors.stock && (
                <p className="text-xs text-accent-error mt-1">{errors.stock.message}</p>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-label text-text-primary mb-2">
                Gambar Produk
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-accent-primary bg-blue-50"
                    : "border-border bg-gray-50 hover:border-accent-primary hover:bg-blue-50/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center">
                    <Upload size={24} className="text-accent-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Drag & drop gambar di sini
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      atau klik untuk memilih file
                    </p>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Format: JPG, PNG, GIF, WebP (Max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-label text-text-primary mb-2">Status</label>
              <Select value={status} onValueChange={(value) => setValue("status", value as "active" | "inactive")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Game Category Selector */}
            <div className="mt-8 pt-8 border-t border-border">
              <GameCategorySelector
                value={gameCategory}
                onChange={(category) => setValue("game_category", category)}
                disabled={isSubmitting}
              />
            </div>

            {/* Login Method Selector */}
            {gameCategory && (
              <div className="mt-8">
                <LoginMethodSelector
                  value={loginMethod}
                  onChange={(method) => {
                    setValue("login_method", method);
                    setShowSecurityGuide(true);
                  }}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-8">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1 text-xs"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary flex-1 text-xs"
              >
                Batal
              </button>
            </div>
          </form>

          {/* Preview */}
          <div>
            <div className="card-border bg-gradient-to-br from-white to-gray-50 p-6 sticky top-20 rounded-lg shadow-sm">
              <h3 className="text-base font-semibold text-text-primary mb-6">
                Preview Produk
              </h3>

              {/* Image Preview */}
              <div className="mb-6">
                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden bg-bg-secondary aspect-square mb-3 shadow-md">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors shadow-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 aspect-square flex items-center justify-center mb-3 border border-border">
                    <div className="text-center">
                      <ImageIcon size={32} className="text-text-secondary opacity-50 mx-auto mb-2" />
                      <p className="text-xs text-text-secondary">Gambar akan ditampilkan di sini</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                {/* Name */}
                <div className="pb-4 border-b border-border">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    Nama Produk
                  </p>
                  <p className="font-medium text-text-primary text-sm line-clamp-2">
                    {name || "Nama produk akan ditampilkan di sini"}
                  </p>
                </div>

                {/* Price */}
                <div className="pb-4 border-b border-border">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    Harga
                  </p>
                  <p className="text-xl font-bold text-accent-primary">
                    {price > 0
                      ? new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(price)
                      : "-"}
                  </p>
                </div>

                {/* Stock */}
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    Stok Tersedia
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-text-primary">
                        {stock > 0 ? stock : "0"}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        stock > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {stock > 0 ? "Tersedia" : "Habis"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-6 pt-6 border-t border-border space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  <div className="w-2 h-2 bg-blue-700 rounded-full"></div>
                  Status: {status === "active" ? "Aktif" : "Nonaktif"}
                </div>

                {/* Game Category Badge */}
                {gameCategory && (
                  <div className="block">
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      Kategori: {gameCategory.replace(/_/g, " ").toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Login Method Badge */}
                {loginMethod && (
                  <div className="block">
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Login: {loginMethod.replace(/_/g, " ").toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Security Guide Section */}
        {showSecurityGuide && loginMethod && (
          <div className="mt-12 pt-12 border-t border-border">
            <div className="mb-8">
              <h2 className="text-section-heading text-text-primary mb-2">
                Panduan Keamanan Akun
              </h2>
              <p className="text-text-secondary">
                Pelajari praktik terbaik untuk melindungi akun Anda
              </p>
            </div>
            <SecurityGuide method={loginMethod} />
          </div>
        )}
      </div>
    </div>
  );
}
