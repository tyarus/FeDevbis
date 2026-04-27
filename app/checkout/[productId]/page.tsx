"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Product } from "@/types";
import { LoadingSkeleton, PriceDisplay } from "@/components";
import { formatRupiah } from "@/lib/utils";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const productId = params.productId as string;
  const queryQuantity = searchParams.get("quantity");

  const { data: product, isLoading } = useSWR<Product>(
    `/products/${productId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    setIsMounted(true);
    if (queryQuantity) {
      setQuantity(Math.max(1, parseInt(queryQuantity) || 1));
    }
  }, [queryQuantity]);

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

  const total = product.price * quantity;

  const handleCheckout = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.post("/orders", {
        product_id: product.id,
        quantity: quantity,
      });

      const orderId = response.data.id || response.data.data?.id;
      if (orderId) {
        router.push(`/payment/${orderId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal membuat pesanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAvailable = product.stock > 0;

  return (
    <div className="section-padding">
      <div className="max-content">
        <button
          onClick={() => router.back()}
          className="text-xs text-text-secondary hover:text-text-primary mb-8"
        >
          ← Kembali
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Left: Product Summary */}
          <div className="md:col-span-2">
            <h1 className="text-section-heading text-text-primary mb-8">Konfirmasi Pesanan</h1>

            <div className="card-border p-6 mb-6">
              <div className="flex gap-6">
                {/* Product Image */}
                <div className="flex-shrink-0 w-24 h-24 bg-bg-secondary rounded-card overflow-hidden">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">
                      No image
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1">
                  <h3 className="text-base font-medium text-text-primary mb-2">
                    {product.name}
                  </h3>
                  <p className="text-body text-text-secondary mb-3">
                    {product.description}
                  </p>
                  <PriceDisplay amount={product.price} />
                </div>
              </div>
            </div>

            {/* Quantity Selection */}
            <div className="card-border p-6 mb-6">
              <label className="block text-base font-medium text-text-primary mb-4">
                Jumlah Produk
              </label>

              <div className="flex items-center gap-4 mb-4">
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
                  className="input-base w-24 text-center text-body"
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

              <p className="text-xs text-text-secondary">
                Stok tersedia: {product.stock} unit
              </p>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div>
            <div className="card-border p-6 sticky top-20">
              <h3 className="text-base font-medium text-text-primary mb-6">Ringkasan Pesanan</h3>

              {error && (
                <div className="mb-6 p-4 bg-accent-error/10 border border-accent-error rounded-input text-accent-error text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-3 mb-6 pb-6 border-b border-border">
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Harga Satuan</span>
                  <span className="text-text-primary">{formatRupiah(product.price)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Jumlah</span>
                  <span className="text-text-primary">{quantity} unit</span>
                </div>
              </div>

              <div className="flex justify-between mb-6">
                <span className="font-medium text-text-primary">Total</span>
                <PriceDisplay amount={total} size="lg" />
              </div>

              <button
                onClick={handleCheckout}
                disabled={!isAvailable || isSubmitting}
                className="btn-primary w-full text-xs disabled:opacity-50"
              >
                {isSubmitting ? "Memproses..." : "Lanjutkan ke Pembayaran"}
              </button>

              <button
                onClick={() => router.back()}
                className="btn-secondary w-full text-xs mt-3"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
