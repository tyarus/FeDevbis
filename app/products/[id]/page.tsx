"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Product } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { LoadingSkeleton, PriceDisplay, SecurityGuide } from "@/components";
import { GAME_CATEGORIES, LOGIN_METHODS } from "@/lib/gameData";
import { getProductMetadata, inferGameCategoryFromText, inferLoginMethodFromText } from "@/lib/productMetadata";
import { Heart } from "lucide-react";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [quantity, setQuantity] = useState(1);
  const [isMounted, setIsMounted] = useState(false);

  const productId = params.id as string;
  const { data: product, isLoading } = useSWR<Product>(
    `/products/${productId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isLoading) {
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

  const isAvailable = product.stock > 0;
  const localMetadata = getProductMetadata(product.id);
  const inferredGameCategory =
    inferGameCategoryFromText(`${product.name} ${product.description}`);
  const inferredLoginMethod =
    inferLoginMethodFromText(`${product.name} ${product.description}`);

  const resolvedGameCategoryId =
    product.game_category ?? localMetadata?.game_category ?? inferredGameCategory;
  const resolvedLoginMethodId =
    product.login_method ?? localMetadata?.login_method ?? inferredLoginMethod;

  const selectedGameCategory = resolvedGameCategoryId
    ? GAME_CATEGORIES.find((category) => category.id === resolvedGameCategoryId)
    : null;
  const selectedLoginMethod = resolvedLoginMethodId
    ? LOGIN_METHODS.find((method) => method.id === resolvedLoginMethodId)
    : null;

  const handleBuyClick = () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "buyer") {
      alert("Hanya pembeli yang dapat membeli produk");
      return;
    }

    router.push(`/checkout/${product.id}?quantity=${quantity}`);
  };

  return (
    <div className="section-padding">
      <div className="max-content">
        <button
          onClick={() => router.back()}
          className="text-xs text-text-secondary hover:text-text-primary mb-8"
        >
          ← Kembali
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left: Image */}
          <div>
            <div className="relative aspect-square bg-bg-secondary rounded-card overflow-hidden">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary">
                  No image
                </div>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="flex flex-col justify-start">
            <h1 className="text-2xl font-medium text-text-primary mb-4">{product.name}</h1>

            <div className="mb-6">
              <div
                className={`inline-block px-3 py-1 rounded-badge text-xs font-medium mb-4 ${
                  isAvailable
                    ? "bg-stock-available-bg text-stock-available-text"
                    : "bg-stock-outOfStock-bg text-stock-outOfStock-text"
                }`}
              >
                {isAvailable ? `${product.stock} tersedia` : "Habis"}
              </div>
              <PriceDisplay amount={product.price} size="lg" />
            </div>

            <p className="text-body text-text-secondary mb-8 leading-relaxed">
              {product.description}
            </p>

            <div className="mb-8 space-y-4">
              <div className="p-4 bg-white border border-border rounded-input">
                <h2 className="text-sm font-semibold text-text-primary mb-3">
                  Informasi Akun Game
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-bg-secondary border border-border">
                    <p className="text-xs text-text-secondary mb-1">Kategori Game</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {selectedGameCategory?.name ?? "Belum diisi oleh penjual"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-bg-secondary border border-border">
                    <p className="text-xs text-text-secondary mb-1">Metode Login</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {selectedLoginMethod?.name ?? "Belum diisi oleh penjual"}
                    </p>
                  </div>
                </div>
              </div>

              <SecurityGuide method={selectedLoginMethod?.id} compact />
            </div>

            {/* Quantity and Buy Button - Only for Buyers */}
            {user?.role === "buyer" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-label text-text-primary mb-2">
                    Jumlah
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 border border-border rounded-input flex items-center justify-center disabled:opacity-50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                      className="input-base w-20 text-center text-body"
                      min="1"
                      max={product.stock}
                    />
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                      className="w-10 h-10 border border-border rounded-input flex items-center justify-center disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleBuyClick}
                    disabled={!isAvailable}
                    className="btn-primary flex-1 text-xs disabled:opacity-50"
                  >
                    Beli Sekarang
                  </button>
                  <button className="btn-secondary px-4 text-xs flex items-center gap-2">
                    <Heart size={16} />
                  </button>
                </div>
              </div>
            )}

            {!user && (
              <div className="space-y-4 pt-4">
                <button
                  onClick={() => router.push("/login")}
                  className="btn-primary w-full text-xs"
                >
                  Masuk untuk Membeli
                </button>
              </div>
            )}

            {user?.role !== "buyer" && user && (
              <div className="p-4 bg-bg-secondary rounded-input text-sm text-text-secondary">
                Hanya pembeli yang dapat membeli produk. Silakan login dengan akun pembeli.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
