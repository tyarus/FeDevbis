"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Product, UpdateProductInput } from "@/types";
import { LoadingSkeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components";

const productSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").optional(),
  description: z.string().min(10, "Deskripsi minimal 10 karakter").optional(),
  price: z.number().min(1000, "Harga minimal Rp 1.000").optional(),
  stock: z.number().min(0, "Stok tidak boleh negatif").optional(),
  image_url: z.string().url("URL gambar tidak valid").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).optional(),
}).partial();

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
    formState: { errors },
  } = useForm<UpdateProductInput>({
    resolver: zodResolver(productSchema),
  });

  const status = watch("status");
  const imageUrl = watch("image_url");
  const price = watch("price");
  const name = watch("name");
  const stock = watch("stock");

  useEffect(() => {
    if (product) {
      setValue("name", product.name);
      setValue("description", product.description);
      setValue("price", product.price);
      setValue("stock", product.stock);
      setValue("image_url", product.image_url || "");
      setValue("status", product.status);
    }
  }, [product, setValue]);

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

  const onSubmit = async (data: UpdateProductInput) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      await apiClient.put(`/products/${product.id}`, data);
      router.push("/seller/products");
    } catch (error: any) {
      setApiError(error.response?.data?.message || "Gagal mengupdate produk");
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
          <h1 className="text-section-heading text-text-primary">Edit Produk</h1>
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

            {/* Image URL */}
            <div>
              <label htmlFor="image_url" className="block text-label text-text-primary mb-2">
                URL Gambar (Opsional)
              </label>
              <input
                {...register("image_url")}
                type="url"
                placeholder="https://..."
                className="input-base w-full text-body"
                disabled={isSubmitting}
              />
              {errors.image_url && (
                <p className="text-xs text-accent-error mt-1">{errors.image_url.message}</p>
              )}
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

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
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
            <div className="card-border p-6 sticky top-20">
              <h3 className="text-base font-medium text-text-primary mb-4">Preview</h3>

              {imageUrl && (
                <div className="mb-4 rounded-card overflow-hidden bg-bg-secondary aspect-video">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => {
                      alert("Gagal memuat gambar. Periksa URL gambar.");
                    }}
                  />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Nama</p>
                  <p className="font-medium text-text-primary">
                    {name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Harga</p>
                  <p className="text-lg font-medium text-text-primary">
                    {price && price > 0
                      ? new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(price)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Stok</p>
                  <p className="font-medium text-text-primary">
                    {stock !== undefined && stock >= 0 ? `${stock} unit` : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
