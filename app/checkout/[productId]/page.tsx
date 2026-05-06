"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Product } from "@/types";
import { LoadingSkeleton, PriceDisplay } from "@/components";
import { formatRupiah, formatShortId } from "@/lib/utils";
import { 
  AlertCircle, 
  Check, 
  Truck, 
  Shield,
  ArrowRight,
  Plus,
  Minus
} from "lucide-react";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

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
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="section-padding">
        <div className="max-content">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary mb-8 transition-colors"
          >
            <span>←</span> Kembali
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left: Product Summary */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                  Konfirmasi Pesanan
                </h1>
                <p className="text-sm text-text-secondary">
                  Periksa detail produk dan jumlah sebelum melanjutkan
                </p>
              </div>

              {/* Product Card */}
              <div className="card-border bg-white p-6 rounded-lg mb-6 hover:shadow-md transition-shadow">
                <div className="flex gap-6">
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">
                        Tidak ada gambar
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-accent-primary">
                        {formatRupiah(product.price)}
                      </span>
                      <span className="text-xs text-text-secondary">
                        per item
                      </span>
                    </div>
                  </div>

                  {/* Stock Status */}
                  <div className="flex-shrink-0 text-right">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      isAvailable 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    }`}>
                      <Check size={14} />
                      {isAvailable ? "Tersedia" : "Habis"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity Selection */}
              <div className="card-border bg-white p-6 rounded-lg">
                <label className="block text-base font-semibold text-text-primary mb-4">
                  Pilih Jumlah Produk
                </label>

                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus size={16} className="text-text-secondary" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                    className="input-base w-20 text-center text-body font-semibold"
                    min="1"
                    max={product.stock}
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                    className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={16} className="text-text-secondary" />
                  </button>
                  <span className="text-xs text-text-secondary ml-auto">
                    Stok: <span className="font-semibold">{product.stock}</span> unit
                  </span>
                </div>

                <p className="text-xs text-text-secondary">
                  Masukkan jumlah yang ingin Anda pesan (minimal 1)
                </p>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="card-border bg-white p-4 rounded-lg text-center">
                  <Shield size={20} className="text-accent-primary mx-auto mb-2" />
                  <p className="text-xs font-medium text-text-primary">Aman</p>
                  <p className="text-xs text-text-secondary">Terenkripsi SSL</p>
                </div>
                <div className="card-border bg-white p-4 rounded-lg text-center">
                  <Truck size={20} className="text-accent-primary mx-auto mb-2" />
                  <p className="text-xs font-medium text-text-primary">Pengiriman</p>
                  <p className="text-xs text-text-secondary">Gratis ongkir</p>
                </div>
                <div className="card-border bg-white p-4 rounded-lg text-center">
                  <Check size={20} className="text-accent-primary mx-auto mb-2" />
                  <p className="text-xs font-medium text-text-primary">Jaminan</p>
                  <p className="text-xs text-text-secondary">100% aman</p>
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="card-border bg-white p-6 rounded-lg sticky top-20">
                <h3 className="text-lg font-semibold text-text-primary mb-6">
                  Ringkasan Pesanan
                </h3>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700">{error}</p>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Harga Satuan</span>
                    <span className="text-text-primary font-medium">
                      {formatRupiah(product.price)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Jumlah</span>
                    <span className="text-text-primary font-medium">
                      {quantity} × item
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Pajak & Biaya</span>
                    <span className="text-text-primary font-medium">Gratis</span>
                  </div>
                </div>

                {/* Total */}
                <div className="mb-6">
                  <div className="flex justify-between items-start">
                    <span className="text-base font-semibold text-text-primary">
                      Total Pembayaran
                    </span>
                    <div className="text-right">
                      <PriceDisplay amount={total} size="lg" className="font-bold" />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <button
                  onClick={handleCheckout}
                  disabled={!isAvailable || isSubmitting}
                  className="btn-primary w-full text-sm font-medium disabled:opacity-50 mb-3 flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      Lanjutkan ke Pembayaran
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.back()}
                  className="btn-secondary w-full text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Kembali
                </button>

                {/* Secure Badge */}
                <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <Shield size={16} className="text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700">Transaksi dijamin aman</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
