"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Order } from "@/types";
import { OrderStatusBadge, OrderTimeline, LoadingSkeleton, ConfirmDialog } from "@/components";
import { formatRupiah, formatDate, formatDateShort } from "@/lib/utils";
import { Truck } from "lucide-react";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export default function SellerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderId = params.id as string;
  const { data: order, isLoading, mutate } = useSWR<Order>(
    `/seller/orders/${orderId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    setIsMounted(true);
    if (order?.tracking_number) {
      setTrackingNumber(order.tracking_number);
    }
  }, [order]);

  if (!isMounted || isLoading) {
    return (
      <div className="section-padding">
        <div className="max-content">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="section-padding text-center">
        <div className="max-content">
          <h1 className="text-section-heading text-text-primary mb-2">Pesanan tidak ditemukan</h1>
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

  const handleShip = async () => {
    if (!trackingNumber.trim()) {
      setError("Nomor tracking harus diisi");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.put(`/seller/orders/${order.id}/ship`, {
        tracking_number: trackingNumber,
      });
      mutate();
      setIsConfirmDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengirim pesanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canShip = order.status === "processing" || order.status === "paid";

  return (
    <div className="section-padding">
      <div className="max-content">
        <button
          onClick={() => router.back()}
          className="text-xs text-text-secondary hover:text-text-primary mb-8"
        >
          ← Kembali ke Pesanan
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Order Details */}
          <div className="md:col-span-2">
            {/* Status Section */}
            <div className="card-border p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Nomor Pesanan</p>
                  <h1 className="text-lg font-medium text-text-primary">#{order.id}</h1>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-xs text-text-secondary">
                Dibuat pada {formatDate(order.created_at)}
              </p>
            </div>

            {/* Buyer Info */}
            <div className="card-border p-6 mb-6">
              <h2 className="text-base font-medium text-text-primary mb-4">Informasi Pembeli</h2>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Nama</p>
                  <p className="font-medium text-text-primary">{order.buyer?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Email</p>
                  <p className="font-medium text-text-primary">{order.buyer?.email}</p>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="card-border p-6 mb-6">
              <h2 className="text-base font-medium text-text-primary mb-4">Rincian Produk</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-body text-text-primary">{order.product?.name}</span>
                  <span className="font-medium text-text-primary">
                    {formatRupiah(order.product?.price || 0)} x {order.quantity}
                  </span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-medium text-text-primary">Total</span>
                  <span className="font-medium text-lg text-text-primary">
                    {formatRupiah(order.total_price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Form */}
            {canShip && (
              <div className="card-border p-6 mb-6">
                <h2 className="text-base font-medium text-text-primary mb-4">Kirim Pesanan</h2>

                {error && (
                  <div className="mb-4 p-4 bg-accent-error/10 border border-accent-error rounded-input text-accent-error text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="tracking" className="block text-label text-text-primary mb-2">
                    Nomor Tracking
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Masukkan nomor tracking pengiriman"
                    className="input-base w-full text-body mb-4"
                  />
                  <button
                    onClick={() => setIsConfirmDialogOpen(true)}
                    className="btn-primary text-xs flex items-center gap-2"
                  >
                    <Truck size={16} />
                    Konfirmasi Pengiriman
                  </button>
                </div>
              </div>
            )}

            {order.tracking_number && (
              <div className="card-border p-6 mb-6">
                <h2 className="text-base font-medium text-text-primary mb-3">Informasi Pengiriman</h2>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Nomor Tracking</p>
                    <p className="font-medium text-text-primary">{order.tracking_number}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="card-border p-6">
              <h2 className="text-base font-medium text-text-primary mb-4">Timeline Pesanan</h2>
              <OrderTimeline order={order} />
            </div>
          </div>

          {/* Right: Summary Sidebar */}
          <div>
            <div className="card-border p-6 sticky top-20">
              <h3 className="text-base font-medium text-text-primary mb-6">Ringkasan</h3>

              <div className="space-y-4 pb-6 border-b border-border">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Status</p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Jumlah Item</p>
                  <p className="text-base font-medium text-text-primary">{order.quantity} unit</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Total</p>
                  <p className="text-lg font-medium text-text-primary">
                    {formatRupiah(order.total_price)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Dibuat</p>
                  <p className="text-xs text-text-primary">{formatDateShort(order.created_at)}</p>
                </div>
              </div>

              {canShip && (
                <div className="mt-4 p-3 bg-blue-50 border border-accent-primary rounded-input text-xs text-accent-primary">
                  Mohon masukkan nomor tracking untuk mengirim pesanan ini kepada pembeli.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          title="Konfirmasi Pengiriman"
          description="Pastikan nomor tracking sudah benar sebelum mengirim. Pembeli akan menerima notifikasi."
          onConfirm={handleShip}
          confirmLabel="Kirim Pesanan"
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}
