"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { FieldErrors, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { GameCategory, LoginMethod, Product, UpdateProductInput } from "@/types";
import { getProductMetadata, inferGameCategoryFromText, inferLoginMethodFromText, saveProductMetadata } from "@/lib/productMetadata";
import { LoadingSkeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, GameCategorySelector, LoginMethodSelector, SecurityGuide } from "@/components";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const optionalNumberField = (min: number, message: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      if (typeof value === "number" && Number.isNaN(value)) return undefined;
      return value;
    },
    z.number().min(min, message)
  ).optional();

const optionalStringField = (min: number, message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().min(min, message)
  ).optional();

const productSchema = z.object({
  name: optionalStringField(3, "Nama minimal 3 karakter"),
  description: optionalStringField(10, "Deskripsi minimal 10 karakter"),
  price: optionalNumberField(1000, "Harga minimal Rp 1.000"),
  stock: optionalNumberField(0, "Stok tidak boleh negatif"),
  image_url: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).optional(),
  game_category: z.enum(["mobile_legends", "pubg_mobile", "free_fire", "efootball", "fifa_26"]).optional(),
  login_method: z.enum(["facebook", "google", "x", "konami_id", "ea"]).optional(),
});

type UpdateProductFormValues = z.output<typeof productSchema>;
type UpdateProductFormInput = z.input<typeof productSchema>;

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSecurityGuide, setShowSecurityGuide] = useState(false);
  const [isImageDirty, setIsImageDirty] = useState(false);

  const productId = params.id as string;
  const { data: product, isLoading } = useSWR<Product>(
    `/products/${productId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UpdateProductFormInput, unknown, UpdateProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  const status = watch("status") as UpdateProductFormValues["status"];
  const name = watch("name") as UpdateProductFormValues["name"];
  const price = watch("price") as UpdateProductFormValues["price"];
  const stock = watch("stock") as UpdateProductFormValues["stock"];
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
      setIsImageDirty(true);
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
    setIsImageDirty(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (product) {
      const localMetadata = getProductMetadata(product.id);
      const inferredGameCategory = inferGameCategoryFromText(`${product.name} ${product.description}`);
      const inferredLoginMethod = inferLoginMethodFromText(`${product.name} ${product.description}`);

      const resolvedGameCategory =
        product.game_category ?? localMetadata?.game_category ?? inferredGameCategory;
      const resolvedLoginMethod =
        product.login_method ?? localMetadata?.login_method ?? inferredLoginMethod;

      reset({
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        image_url: product.image_url || "",
        status: product.status,
        game_category: resolvedGameCategory,
        login_method: resolvedLoginMethod,
      });
      setShowSecurityGuide(Boolean(resolvedLoginMethod));
      if (product.image_url) {
        setImagePreview(product.image_url);
      }
      setIsImageDirty(false);
    }
  }, [product, reset]);

  if (isLoading) {
    return (
      <div className="section-padding">
        <div className="max-content">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="section-padding text-center">
        <div className="max-content">
          <h1 className="text-section-heading text-text-primary mb-2">Produk tidak ditemukan</h1>
          <button
            onClick={() => router.back()}
            className="btn-secondary text-xs mt-6"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: UpdateProductFormValues) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      const payload: UpdateProductInput = {
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        status: data.status,
        game_category: data.game_category ?? gameCategory,
        login_method: data.login_method ?? loginMethod,
      };

      if (isImageDirty) {
        payload.image_url = data.image_url;
      }

      await apiClient.put(`/products/${product.id}`, payload);
      saveProductMetadata(product.id, {
        game_category: data.game_category ?? gameCategory,
        login_method: data.login_method ?? loginMethod,
      });
      router.push("/seller/products");
    } catch (error: unknown) {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        setApiError(axiosError.response?.data?.message || "Gagal mengupdate produk");
      } else {
        setApiError("Gagal mengupdate produk");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitInvalid = (formErrors: FieldErrors<UpdateProductFormInput>) => {
    const messages = collectErrorMessages(formErrors);
    if (messages.length > 0) {
      setApiError(`Form belum valid: ${messages.join(" | ")}`);
      return;
    }
    setApiError("Form belum valid. Cek kembali field yang wajib dan format input.");
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
          <h1 className="text-section-heading text-text-primary">Edit Produk</h1>
        </div>

        {apiError && (
          <div className="mb-6 p-4 bg-accent-error/10 border border-accent-error rounded-input text-accent-error text-sm">
            {apiError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit, onSubmitInvalid)} className="md:col-span-2 space-y-6">
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
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
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
                    {name || "-"}
                  </p>
                </div>

                {/* Price */}
                <div className="pb-4 border-b border-border">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    Harga
                  </p>
                  <p className="text-xl font-bold text-accent-primary">
                    {price && price > 0
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
                        {stock || "0"}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        stock && stock > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {stock && stock > 0 ? "Tersedia" : "Habis"}
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

function collectErrorMessages(errors: FieldErrors<UpdateProductFormInput>): string[] {
  const allMessages: string[] = [];

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;

    const maybeMessage = (node as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      allMessages.push(maybeMessage);
    }

    Object.values(node as Record<string, unknown>).forEach(walk);
  };

  walk(errors);
  return Array.from(new Set(allMessages));
}
