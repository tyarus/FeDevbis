"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Product } from "@/types";
import { ProductCard, LoadingSkeleton, EmptyState } from "@/components";
import { ShoppingBag, Lock, Zap } from "lucide-react";

const fetcher = (url: string) =>
  apiClient.get(url).then((res) => ({
    data: res.data.data,
    pagination: res.data.pagination,
  }));

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const { data: productsData, isLoading } = useSWR<{
    data: Product[];
  }>("/products?limit=6", fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const products = productsData?.data || [];

  return (
    <div>
      {/* Hero Section */}
      <section className="section-padding text-center">
        <div className="max-content">
          <h1 className="text-hero mb-4 text-text-primary">Jual beli aman, tanpa risiko.</h1>
          <p className="text-lg leading-7 text-text-secondary mb-8 max-w-[520px] mx-auto">
            Platform marketplace dengan sistem escrow yang melindungi pembeli dan penjual dari risiko transaksi.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/products" className="btn-primary text-xs">
              Jelajahi Produk
            </Link>
            <Link href="/register" className="btn-secondary text-xs">
              Mulai Berjualan
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-bg-secondary">
        <div className="max-content">
          <h2 className="text-section-heading text-center mb-12 text-text-primary">
            Mengapa Memilih Escrow?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0">
            {/* Feature 1 */}
            <div className="md:border-r border-border md:pr-6">
              <Lock size={32} className="text-text-primary mb-4" />
              <h3 className="text-base font-medium text-text-primary mb-2">
                Transaksi Aman
              </h3>
              <p className="text-body text-text-secondary">
                Dana pembeli dilindungi dalam sistem escrow hingga barang diterima dengan sempurna.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="md:border-r border-border md:px-6 md:py-0 py-4">
              <ShoppingBag size={32} className="text-text-primary mb-4" />
              <h3 className="text-base font-medium text-text-primary mb-2">
                Kemudahan Belanja
              </h3>
              <p className="text-body text-text-secondary">
                Proses pembelian yang mudah dengan berbagai metode pembayaran yang tersedia.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="md:pl-6">
              <Zap size={32} className="text-text-primary mb-4" />
              <h3 className="text-base font-medium text-text-primary mb-2">
                Pengiriman Cepat
              </h3>
              <p className="text-body text-text-secondary">
                Lacak pesanan secara real-time dan dapatkan notifikasi setiap update pengiriman.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Products Section */}
      <section className="section-padding">
        <div className="max-content">
          <h2 className="text-section-heading text-text-primary mb-8">Produk Terbaru</h2>
          {isLoading ? (
            <LoadingSkeleton count={6} />
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="text-center mt-12">
                <Link href="/products" className="btn-secondary text-xs">
                  Lihat Semua Produk
                </Link>
              </div>
            </>
          ) : (
            <EmptyState
              icon={ShoppingBag}
              title="Belum ada produk"
              description="Produk akan segera tersedia"
            />
          )}
        </div>
      </section>
    </div>
  );
}
